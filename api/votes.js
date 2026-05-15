import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  const date = todayUTC();

  // POST /api/votes — submit a completed bracket
  if (req.method === 'POST') {
    const { userId, picks } = req.body;
    if (!userId || !picks || typeof picks !== 'object') {
      return res.status(400).json({ error: 'userId and picks required' });
    }

    // picks: { [matchupId]: winnerActorId }
    const voteKey = `votes:${date}`;

    // Store individual user's picks (overwrite if they resubmit)
    await kv.hset(voteKey, { [userId]: JSON.stringify(picks) });

    // Expire votes at midnight + 1 hour
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(25, 0, 0, 0);
    await kv.expireat(voteKey, Math.floor(midnight / 1000));

    return res.status(200).json({ ok: true });
  }

  // GET /api/votes — return aggregate results for today
  if (req.method === 'GET') {
    const voteKey = `votes:${date}`;
    const allVotes = await kv.hgetall(voteKey);

    if (!allVotes) {
      return res.status(200).json({ totalVoters: 0, matchupTotals: {} });
    }

    // Tally votes per matchup
    const matchupTotals = {}; // { [matchupId]: { [actorId]: count } }
    const allPicks = Object.values(allVotes).map(v => JSON.parse(v));

    for (const picks of allPicks) {
      for (const [matchupId, winnerId] of Object.entries(picks)) {
        if (!matchupTotals[matchupId]) matchupTotals[matchupId] = {};
        matchupTotals[matchupId][winnerId] = (matchupTotals[matchupId][winnerId] || 0) + 1;
      }
    }

    return res.status(200).json({
      totalVoters: allPicks.length,
      matchupTotals,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
