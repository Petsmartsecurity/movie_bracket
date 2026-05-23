import ActorSlot from './ActorSlot';
import MovieSlot from './MovieSlot';

export default function Matchup({ matchup, entityMap, actorMap, onSelectWinner, submitted, mode = 'actors' }) {
  const map = entityMap ?? actorMap ?? {};
  const isMovies = mode === 'movies';
  const SlotComp = isMovies ? MovieSlot : ActorSlot;
  const getEntityId = s => isMovies ? s.movieId : s.actorId;

  const [s0, s1] = matchup.slots;
  const eid0 = getEntityId(s0);
  const eid1 = getEntityId(s1);
  const w = matchup.winnerId;

  function slotProps(slot, eid, slotIdx) {
    const entityKey = isMovies ? 'movie' : 'actor';
    return {
      slot,
      [entityKey]: eid ? map[eid] : null,
      isWinner: !!(w && w === eid && eid),
      isLoser:  !!(w && w !== eid && eid),
      onClick: () => onSelectWinner(matchup.id, slotIdx),
      submitted,
    };
  }

  return (
    <div className="matchup">
      <SlotComp {...slotProps(s0, eid0, 0)} />
      <div className="matchup-divider" />
      <SlotComp {...slotProps(s1, eid1, 1)} />
    </div>
  );
}
