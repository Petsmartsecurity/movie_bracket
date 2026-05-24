// Local dev server that stubs Vercel KV with an in-memory store.
// Mirrors production handler behaviour in bracket.js and votes.js so that
// era brackets and vote aggregation work identically during local dev.
// Run with: node api/dev-server.js
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateDailyBracket } from './_bracketGenerator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

// Valid era slugs — keep in sync with VALID_ERAS in bracket.js
const VALID_ERAS = new Set([
  'alltime', '2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s',
]);

// In-memory KV stub (mirrors Upstash Redis interface used in production)
const store = {};
const kv = {
  get:      async (k)      => store[k] ?? null,
  set:      async (k, v)   => { store[k] = v; },
  hset:     async (k, obj) => { store[k] = { ...store[k] }; Object.assign(store[k], obj); },
  hgetall:  async (k)      => store[k] || null,
  expireat: async ()       => {},  // no-op in dev
};

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function parseQuery(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return { pathname: url, query: {} };
  const pathname = url.slice(0, idx);
  const query = Object.fromEntries(new URLSearchParams(url.slice(idx + 1)));
  return { pathname, query };
}

async function handleBracket(query) {
  const date    = todayUTC();
  const rawEra  = query.era || 'alltime';
  const era     = VALID_ERAS.has(rawEra) ? rawEra : 'alltime';
  const cacheKey = era === 'alltime' ? `bracket:${date}` : `bracket:${date}:${era}`;

  let bracket = await kv.get(cacheKey);
  if (!bracket) {
    const actorsPath = join(__dirname, '..', 'client', 'public', 'actors.json');
    const { actors } = JSON.parse(readFileSync(actorsPath, 'utf-8'));
    bracket = generateDailyBracket(actors, date, era === 'alltime' ? null : era);
    await kv.set(cacheKey, bracket);
  }

  const bracketId = era === 'alltime' ? `actors-${date}` : `actors-${era}-${date}`;
  if (bracket && typeof bracket === 'object' && !bracket.bracketId) {
    bracket = { ...bracket, bracketId };
  }
  return bracket;
}

async function handleVotesGet(query) {
  const { bracketId } = query;
  if (!bracketId) throw Object.assign(new Error('bracketId required'), { status: 400 });

  const voteKey  = `votes:${bracketId}`;
  const allVotes = await kv.hgetall(voteKey);
  if (!allVotes) return { bracketId, totalVoters: 0, matchupTotals: {} };

  const allPicks = Object.values(allVotes).map(v => {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v;
    return parsed.picks ?? parsed;
  });

  const matchupTotals = {};
  for (const picks of allPicks) {
    for (const [matchupId, winnerId] of Object.entries(picks)) {
      if (!matchupTotals[matchupId]) matchupTotals[matchupId] = {};
      matchupTotals[matchupId][winnerId] = (matchupTotals[matchupId][winnerId] || 0) + 1;
    }
  }
  return { bracketId, totalVoters: allPicks.length, matchupTotals };
}

async function handleVotesPost(body) {
  const { userId, picks, bracketId, mode } = body;
  if (!userId || !picks || !bracketId) {
    throw Object.assign(new Error('userId, picks, and bracketId required'), { status: 400 });
  }
  const entry = JSON.stringify({ picks, mode: mode ?? 'actors', submittedAt: new Date().toISOString() });
  await kv.hset(`votes:${bracketId}`, { [userId]: entry });
  return { ok: true };
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const { pathname, query } = parseQuery(req.url);

  try {
    let result;
    if (pathname === '/api/bracket' && req.method === 'GET') {
      result = await handleBracket(query);
    } else if (pathname === '/api/votes' && req.method === 'GET') {
      result = await handleVotesGet(query);
    } else if (pathname === '/api/votes' && req.method === 'POST') {
      const body = await new Promise(resolve => {
        let data = '';
        req.on('data', c => data += c);
        req.on('end', () => resolve(JSON.parse(data)));
      });
      result = await handleVotesPost(body);
    } else {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Not found' }));
    }
    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch (e) {
    res.writeHead(e.status ?? 500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`Dev API server on http://localhost:${PORT}`));
