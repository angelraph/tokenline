import { proxy } from '@/lib/proxy';

export const runtime = 'nodejs';
export const maxDuration = 300;

export const POST = (req: Request) => proxy(req, 'openai');
