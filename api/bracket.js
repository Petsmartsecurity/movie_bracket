import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();
import { generateDailyBracket } from './_bracketGenerator.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Valid era slugs — must match ACTOR_ERAS in the client
const VALID_ERAS = new Set([
  'alltime', '2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s',
]);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const date = todayUTC();
  const rawEra = req.query.era || 'alltime';
  const era = VALID_ERAS.has(rawEra) ? rawEra : 'alltime';
  const cacheKey = era === 'alltime' ? `bracket:${date}` : `bracket:${date}:${era}`;

  // Return cached bracket if already generated today
  let bracket = await kv.get(cacheKey);
  if (!bracket) {
    const actorsPath = join(process.cwd(), 'client', 'public', 'actors.json');
    const { actors } = JSON.parse(readFileSync(actorsPath, 'utf-8'));
    bracket = generateDailyBracket(actors, date, era === 'alltime' ? null : era);
    // Cache until 1 AM UTC the next day (midnight + 1 hr buffer).
    // setUTCHours(25) overflows into the next calendar day — equivalent to
    // "tomorrow at 01:00 UTC" without manual date arithmetic.
    const now = new Date();
    const expiry = new Date(now);
    expiry.setUTCHours(25, 0, 0, 0);
    const ttl = Math.floor((expiry - now) / 1000);
    await kv.set(cacheKey, bracket, { ex: ttl });
  }

  // Attach bracketId so the client knows which key to use for vote storage
  const bracketId = era === 'alltime' ? `actors-${date}` : `actors-${era}-${date}`;
  if (bracket && typeof bracket === 'object' && !bracket.bracketId) {
    bracket = { ...bracket, bracketId };
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60');
  return res.status(200).json(bracket);
}
