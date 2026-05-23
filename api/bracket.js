import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();
import { generateDailyBracket } from './_bracketGenerator.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const date = todayUTC();
  const cacheKey = `bracket:${date}`;

  // Return cached bracket if already generated today
  let bracket = await kv.get(cacheKey);
  if (!bracket) {
    const actorsPath = join(process.cwd(), 'client', 'public', 'actors.json');
    const { actors } = JSON.parse(readFileSync(actorsPath, 'utf-8'));
    bracket = generateDailyBracket(actors, date);
    // Cache until midnight UTC + 1 hour buffer
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(25, 0, 0, 0); // next day 1am UTC
    const ttl = Math.floor((midnight - now) / 1000);
    await kv.set(cacheKey, bracket, { ex: ttl });
  }

  // Attach bracketId so the client knows which key to use for vote storage
  if (bracket && typeof bracket === 'object' && !bracket.bracketId) {
    bracket = { ...bracket, bracketId: `actors-${date}` };
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60');
  return res.status(200).json(bracket);
}
