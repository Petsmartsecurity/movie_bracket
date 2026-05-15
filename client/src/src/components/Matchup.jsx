import ActorSlot from './ActorSlot';

export default function Matchup({ matchup, actorMap, onSelectWinner }) {
  const [s0, s1] = matchup.slots;

  return (
    <div className="matchup">
      <ActorSlot
        slot={s0}
        actor={s0.actorId ? actorMap[s0.actorId] : null}
        isWinner={matchup.winnerId === s0.actorId && !!s0.actorId}
        isLoser={matchup.winnerId && matchup.winnerId !== s0.actorId && !!s0.actorId}
        onClick={() => onSelectWinner(matchup.id, 0)}
      />
      <div className="matchup-divider" />
      <ActorSlot
        slot={s1}
        actor={s1.actorId ? actorMap[s1.actorId] : null}
        isWinner={matchup.winnerId === s1.actorId && !!s1.actorId}
        isLoser={matchup.winnerId && matchup.winnerId !== s1.actorId && !!s1.actorId}
        onClick={() => onSelectWinner(matchup.id, 1)}
      />
    </div>
  );
}
