import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { config } from './config';

export type Agent = {
  id: string;
  name: string;
  wallet: string;
  mint: string | null;
  xHandle: string | null;
  keyHash: string;
  keyPrefix: string;
  verified: boolean;
  frozen: boolean;
  createdAt: string;
};

export type EventType =
  | 'apply' | 'verify' | 'draw' | 'repay' | 'collateral' | 'collateral_release'
  | 'deposit' | 'withdraw' | 'freeze' | 'unfreeze' | 'buyback' | 'sale';

export type LedgerEvent = {
  id: string;
  agentId: string | null;
  type: EventType;
  /** USD value at the time of the event. */
  amountUsd: number;
  asset: string | null;
  /** Native units of `asset` (SOL, USDC, ANSEM...). */
  amount: number | null;
  txSig: string | null;
  meta: Record<string, unknown> | null;
  at: string;
};

export interface Store {
  createAgent(a: Omit<Agent, 'id' | 'createdAt'>): Promise<Agent>;
  getAgent(id: string): Promise<Agent | null>;
  getAgentByKeyHash(h: string): Promise<Agent | null>;
  getAgentByWallet(w: string): Promise<Agent | null>;
  listAgents(): Promise<Agent[]>;
  updateAgent(id: string, patch: Partial<Agent>): Promise<void>;
  /** Returns false if an event with the same txSig already exists. */
  addEvent(e: Omit<LedgerEvent, 'id' | 'at'> & { at?: string }): Promise<boolean>;
  listEvents(q?: { agentId?: string; limit?: number }): Promise<LedgerEvent[]>;
  /** Events recorded for an on-chain signature (exact, or "sig:..." per-transfer keys). */
  eventsForSignature(sig: string): Promise<LedgerEvent[]>;
  deleteEvent(id: string): Promise<void>;
  getKv<T>(k: string): Promise<T | null>;
  setKv(k: string, v: unknown): Promise<void>;
}

// JSON file (dev)

type FileDb = { agents: Agent[]; events: LedgerEvent[]; kv: Record<string, unknown> };

class FileStore implements Store {
  private file = path.join(process.cwd(), 'data', 'db.json');
  private db: FileDb | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  private async load(): Promise<FileDb> {
    if (this.db) return this.db;
    try {
      this.db = JSON.parse(await fs.readFile(this.file, 'utf8')) as FileDb;
    } catch {
      this.db = { agents: [], events: [], kv: {} };
    }
    return this.db;
  }

  private save() {
    // Serialise writes so concurrent requests can't interleave partial files.
    this.chain = this.chain.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(this.db, null, 2));
    });
    return this.chain;
  }

  async createAgent(a: Omit<Agent, 'id' | 'createdAt'>) {
    const db = await this.load();
    const agent: Agent = { ...a, id: randomUUID(), createdAt: new Date().toISOString() };
    db.agents.push(agent);
    await this.save();
    return agent;
  }
  async getAgent(id: string) { return (await this.load()).agents.find((a) => a.id === id) ?? null; }
  async getAgentByKeyHash(h: string) { return (await this.load()).agents.find((a) => a.keyHash === h) ?? null; }
  async getAgentByWallet(w: string) { return (await this.load()).agents.find((a) => a.wallet === w) ?? null; }
  async listAgents() { return [...(await this.load()).agents]; }
  async updateAgent(id: string, patch: Partial<Agent>) {
    const db = await this.load();
    const a = db.agents.find((x) => x.id === id);
    if (a) Object.assign(a, patch, { id });
    await this.save();
  }
  async addEvent(e: Omit<LedgerEvent, 'id' | 'at'> & { at?: string }) {
    const db = await this.load();
    if (e.txSig && db.events.some((x) => x.txSig === e.txSig && x.type === e.type)) return false;
    db.events.push({ ...e, id: randomUUID(), at: e.at ?? new Date().toISOString() });
    await this.save();
    return true;
  }
  async listEvents(q: { agentId?: string; limit?: number } = {}) {
    const all = (await this.load()).events.filter((e) => !q.agentId || e.agentId === q.agentId);
    return all.slice().reverse().slice(0, q.limit ?? 500);
  }
  async eventsForSignature(sig: string) {
    return (await this.load()).events.filter((e) => e.txSig === sig || e.txSig?.startsWith(sig + ':'));
  }
  async deleteEvent(id: string) {
    const db = await this.load();
    db.events = db.events.filter((e) => e.id !== id);
    await this.save();
  }
  async getKv<T>(k: string) { return ((await this.load()).kv[k] as T) ?? null; }
  async setKv(k: string, v: unknown) { (await this.load()).kv[k] = v; await this.save(); }
}

// Postgres (prod)

class PgStore implements Store {
  private sql = postgres(config.databaseUrl, { max: 5, idle_timeout: 20, prepare: false });
  private ready: Promise<void> | null = null;

  private init() {
    this.ready ??= (async () => {
      await this.sql`create table if not exists tl_agents (
        id uuid primary key, name text not null, wallet text not null unique, mint text,
        x_handle text, key_hash text not null unique, key_prefix text not null,
        verified boolean not null default false, frozen boolean not null default false,
        created_at timestamptz not null default now())`;
      await this.sql`create table if not exists tl_events (
        id uuid primary key, agent_id uuid, type text not null, amount_usd double precision not null default 0,
        asset text, amount double precision, tx_sig text, meta jsonb, at timestamptz not null default now())`;
      await this.sql`create unique index if not exists tl_events_sig on tl_events (tx_sig, type) where tx_sig is not null`;
      await this.sql`create index if not exists tl_events_agent on tl_events (agent_id, at desc)`;
      await this.sql`create table if not exists tl_kv (k text primary key, v jsonb)`;
    })();
    return this.ready;
  }

  private row(r: Record<string, any>): Agent {
    return {
      id: r.id, name: r.name, wallet: r.wallet, mint: r.mint, xHandle: r.x_handle, keyHash: r.key_hash,
      keyPrefix: r.key_prefix, verified: r.verified, frozen: r.frozen, createdAt: new Date(r.created_at).toISOString(),
    };
  }

  async createAgent(a: Omit<Agent, 'id' | 'createdAt'>) {
    await this.init();
    const id = randomUUID();
    const [r] = await this.sql`insert into tl_agents (id, name, wallet, mint, x_handle, key_hash, key_prefix, verified, frozen)
      values (${id}, ${a.name}, ${a.wallet}, ${a.mint}, ${a.xHandle}, ${a.keyHash}, ${a.keyPrefix}, ${a.verified}, ${a.frozen})
      returning *`;
    return this.row(r);
  }
  async getAgent(id: string) {
    await this.init();
    const [r] = await this.sql`select * from tl_agents where id = ${id}`;
    return r ? this.row(r) : null;
  }
  async getAgentByKeyHash(h: string) {
    await this.init();
    const [r] = await this.sql`select * from tl_agents where key_hash = ${h}`;
    return r ? this.row(r) : null;
  }
  async getAgentByWallet(w: string) {
    await this.init();
    const [r] = await this.sql`select * from tl_agents where wallet = ${w}`;
    return r ? this.row(r) : null;
  }
  async listAgents() {
    await this.init();
    return (await this.sql`select * from tl_agents order by created_at`).map((r) => this.row(r));
  }
  async updateAgent(id: string, p: Partial<Agent>) {
    await this.init();
    const cur = await this.getAgent(id);
    if (!cur) return;
    const n = { ...cur, ...p };
    await this.sql`update tl_agents set name=${n.name}, mint=${n.mint}, x_handle=${n.xHandle}, key_hash=${n.keyHash},
      key_prefix=${n.keyPrefix}, verified=${n.verified}, frozen=${n.frozen} where id=${id}`;
  }
  async addEvent(e: Omit<LedgerEvent, 'id' | 'at'> & { at?: string }) {
    await this.init();
    const rows = await this.sql`insert into tl_events (id, agent_id, type, amount_usd, asset, amount, tx_sig, meta, at)
      values (${randomUUID()}, ${e.agentId}, ${e.type}, ${e.amountUsd}, ${e.asset}, ${e.amount}, ${e.txSig},
        ${e.meta ? this.sql.json(e.meta as any) : null}, ${e.at ?? new Date().toISOString()})
      on conflict do nothing returning id`;
    return rows.length > 0;
  }
  async listEvents(q: { agentId?: string; limit?: number } = {}) {
    await this.init();
    const lim = q.limit ?? 500;
    const rows = q.agentId
      ? await this.sql`select * from tl_events where agent_id = ${q.agentId} order by at desc limit ${lim}`
      : await this.sql`select * from tl_events order by at desc limit ${lim}`;
    return rows.map((r) => ({
      id: r.id, agentId: r.agent_id, type: r.type, amountUsd: r.amount_usd, asset: r.asset, amount: r.amount,
      txSig: r.tx_sig, meta: r.meta, at: new Date(r.at).toISOString(),
    })) as LedgerEvent[];
  }
  async eventsForSignature(sig: string) {
    await this.init();
    const rows = await this.sql`select * from tl_events where tx_sig = ${sig} or tx_sig like ${sig + ':%'}`;
    return rows.map((r) => ({
      id: r.id, agentId: r.agent_id, type: r.type, amountUsd: r.amount_usd, asset: r.asset, amount: r.amount,
      txSig: r.tx_sig, meta: r.meta, at: new Date(r.at).toISOString(),
    })) as LedgerEvent[];
  }
  async deleteEvent(id: string) {
    await this.init();
    await this.sql`delete from tl_events where id = ${id}`;
  }
  async getKv<T>(k: string) {
    await this.init();
    const [r] = await this.sql`select v from tl_kv where k = ${k}`;
    return (r?.v as T) ?? null;
  }
  async setKv(k: string, v: unknown) {
    await this.init();
    await this.sql`insert into tl_kv (k, v) values (${k}, ${this.sql.json(v as any)})
      on conflict (k) do update set v = excluded.v`;
  }
}

const g = globalThis as unknown as { __tlStore?: Store };
export const store: Store = (g.__tlStore ??= config.databaseUrl ? new PgStore() : new FileStore());
