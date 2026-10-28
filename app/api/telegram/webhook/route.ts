import {env} from 'cloudflare:workers';
import {webhook} from '../../../../lib/telegram-bot.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return webhook(request,env);}
