import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();

export default async function handler(req, res) {

  // ── POST /api/votes — submit a completed bracket ──────────────────────────
  if (req.method === 'POST') {
    const { userId, picks, bracketId, mode } = req.body;

    if (!userId || !picks || typeof picks !== 'object' || !bracketId) {
      return res.status(400).json({ error: 'userId, picks, and bracketId required' });
    }

    const voteKey = `votes:${bracketId}`;
    const entry = JSON.stringify({
      picks,
      mode: mode ?? 'actors',
      submittedAt: new Date().toISOString(),
    });

    // Store user's picks (overwrites if they resubmit)
    await kv.hset(voteKey, { [userId]: entry });

    // Actor brackets expire at midnight+1 hr UTC; movie brackets are permanent
    if (bracketId.startsWith('actors-')) {
      const midnight = new Date();
      midnight.setUTCHours(25, 0, 0, 0);
      await kv.expireat(voteKey, Math.floor(midnight / 1000));
    }

    return res.status(200).json({ ok: true });
  }

  // ── GET /api/votes?bracketId=xxx — aggregate results ─────────────────────
  if (req.method === 'GET') {
    const { bracketId } = req.query;
    if (!bracketId) return res.status(400).json({ error: 'bracketId required' });

    const voteKey = `votes:${bracketId}`;
    const allVotes = await kv.hgetall(voteKey);

    if (!allVotes) {
      return res.status(200).json({ bracketId, totalVoters: 0, matchupTotals: {} });
    }

    const allPicks = Object.values(allVotes).map(v => {
      const parsed = typeof v === 'string' ? JSON.parse(v) : v;
      // Support both new format { picks, mode, submittedAt } and old { [matchupId]: winnerId }
      return parsed.picks ?? parsed;
    });

    const matchupTotals = {};
    for (const picks of allPicks) {
      for (const [matchupId, winnerId] of Object.entries(picks)) {
        if (!matchupTotals[matchupId]) matchupTotals[matchupId] = {};
        matchupTotals[matchupId][winnerId] = (matchupTotals[matchupId][winnerId] || 0) + 1;
      }
    }

    return res.status(200).json({ bracketId, totalVoters: allPicks.length, matchupTotals });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
