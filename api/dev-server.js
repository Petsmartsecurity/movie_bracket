// Local dev server that stubs Vercel KV with an in-memory store
// Run with: node api/dev-server.js
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateDailyBracket } from './_bracketGenerator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

// In-memory KV stub
const store = {};
const kv = {
  get: async (k) => store[k] ?? null,
  set: async (k, v) => { store[k] = v; },
  hset: async (k, obj) => {
    store[k] = store[k] || {};
    Object.assign(store[k], obj);
  },
  hgetall: async (k) => store[k] || null,
  expireat: async () => {},
};

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

async function handleBracket(req, res) {
  const date = todayUTC();
  const cacheKey = `bracket:${date}`;
  let bracket = await kv.get(cacheKey);
  if (!bracket) {
    const actorsPath = join(__dirname, '..', 'client', 'public', 'actors.json');
    const { actors } = JSON.parse(readFileSync(actorsPath, 'utf-8'));
    bracket = generateDailyBracket(actors, date);
    await kv.set(cacheKey, bracket);
  }
  return bracket;
}

async function handleVotesGet() {
  const voteKey = `votes:${todayUTC()}`;
  const allVotes = await kv.hgetall(voteKey);
  if (!allVotes) return { totalVoters: 0, matchupTotals: {} };
  const matchupTotals = {};
  for (const picks of Object.values(allVotes).map(v => JSON.parse(v))) {
    for (const [matchupId, winnerId] of Object.entries(picks)) {
      if (!matchupTotals[matchupId]) matchupTotals[matchupId] = {};
      matchupTotals[matchupId][winnerId] = (matchupTotals[matchupId][winnerId] || 0) + 1;
    }
  }
  return { totalVoters: Object.keys(allVotes).length, matchupTotals };
}

async function handleVotesPost(body) {
  const { userId, picks } = body;
  if (!userId || !picks) throw new Error('userId and picks required');
  await kv.hset(`votes:${todayUTC()}`, { [userId]: JSON.stringify(picks) });
  return { ok: true };
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  try {
    let result;
    if (req.url === '/api/bracket' && req.method === 'GET') {
      result = await handleBracket(req, res);
    } else if (req.url === '/api/votes' && req.method === 'GET') {
      result = await handleVotesGet();
    } else if (req.url === '/api/votes' && req.method === 'POST') {
      const body = await new Promise(resolve => {
        let data = '';
        req.on('data', c => data += c);
        req.on('end', () => resolve(JSON.parse(data)));
      });
      result = await handleVotesPost(body);
    } else {
      res.writeHead(404); return res.end(JSON.stringify({ error: 'Not found' }));
    }
    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`API dev server running on http://localhost:${PORT}`));
