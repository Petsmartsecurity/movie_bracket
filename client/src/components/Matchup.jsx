import ActorSlot from './ActorSlot';
import MovieSlot from './MovieSlot';

export default function Matchup({
  matchup, entityMap, actorMap, onSelectWinner,
  submitted, mode = 'actors', voteResults,
}) {
  const map = entityMap ?? actorMap ?? {};
  const isMovies = mode === 'movies';
  const SlotComp = isMovies ? MovieSlot : ActorSlot;
  const getEntityId = s => isMovies ? s.movieId : s.actorId;

  const [s0, s1] = matchup.slots;
  const eid0 = getEntityId(s0);
  const eid1 = getEntityId(s1);
  const w = matchup.winnerId;

  function slotProps(slot, eid, slotIdx) {
    return {
      slot,
      [isMovies ? 'movie' : 'actor']: eid ? map[eid] : null,
      isWinner: !!(w && w === eid && eid),
      isLoser:  !!(w && w !== eid && eid),
      onClick: () => onSelectWinner(matchup.id, slotIdx),
      submitted,
    };
  }

  // Build vote-split bar when results are available and both slots are filled
  let voteBar = null;
  if (voteResults && voteResults.totalVoters > 0 && eid0 && eid1) {
    const totals = voteResults.matchupTotals?.[matchup.id] ?? {};
    const v0 = totals[eid0] ?? 0;
    const v1 = totals[eid1] ?? 0;
    const total = v0 + v1;
    if (total > 0) {
      const pct0 = Math.round((v0 / total) * 100);
      voteBar = { pct0, pct1: 100 - pct0 };
    }
  }

  return (
    <div className="matchup">
      <SlotComp {...slotProps(s0, eid0, 0)} />

      {voteBar ? (
        <div className="vote-split">
          <div className="vote-split-bar">
            <div
              className="vote-split-fill"
              style={{ width: `${voteBar.pct0}%` }}
            />
          </div>
          <div className="vote-split-pcts">
            <span>{voteBar.pct0}%</span>
            <span>{voteBar.pct1}%</span>
          </div>
        </div>
      ) : (
        <div className="matchup-divider" />
      )}

      <SlotComp {...slotProps(s1, eid1, 1)} />
    </div>
  );
}
