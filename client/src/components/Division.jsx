import Matchup from './Matchup';

export default function Division({ divIndex, name, matchups, actorMap, onSelectWinner, reversed, submitted }) {
  const rounds = [0, 1, 2, 3].map(round => {
    const count = Math.pow(2, 3 - round);
    return Array.from({ length: count }, (_, i) => matchups[`div${divIndex}-r${round}-m${i}`]);
  });

  const roundLabels = ['Round 1', 'Round 2', 'Sweet 16', 'Elite 8'];
  const displayRounds = reversed ? [...rounds].reverse() : rounds;
  const displayLabels = reversed ? [...roundLabels].reverse() : roundLabels;

  return (
    <div className={`division ${reversed ? 'reversed' : ''}`}>
      <div className="division-header">{name}</div>
      <div className="division-rounds">
        {displayRounds.map((roundMatchups, di) => (
          <div key={di} className="round-col">
            <div className="round-label">{displayLabels[di]}</div>
            <div className="round-matchups">
              {roundMatchups.map(m => (
                <div key={m.id} className="matchup-cell">
                  <Matchup matchup={m} actorMap={actorMap} onSelectWinner={onSelectWinner} submitted={submitted} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
