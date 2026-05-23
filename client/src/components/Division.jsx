import Matchup from './Matchup';
import { MOVIE_ROUND_LABELS } from '../movieBracketUtils';

const ACTOR_ROUND_LABELS = ['Round 1', 'Round 2', 'Sweet 16', 'Elite 8'];

export default function Division({
  divIndex, name, matchups, entityMap, actorMap,
  onSelectWinner, reversed, submitted,
  mode = 'actors',
}) {
  const map = entityMap ?? actorMap;
  const isMovies = mode === 'movies';
  const numRounds = isMovies ? 3 : 4;
  const roundLabels = isMovies ? MOVIE_ROUND_LABELS : ACTOR_ROUND_LABELS;

  const rounds = Array.from({ length: numRounds }, (_, round) => {
    const count = Math.pow(2, numRounds - 1 - round);
    return Array.from({ length: count }, (_, i) => {
      const m = matchups[`div${divIndex}-r${round}-m${i}`];
      return m ?? null;
    }).filter(Boolean);
  });

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
                  <Matchup
                    matchup={m}
                    entityMap={map}
                    onSelectWinner={onSelectWinner}
                    submitted={submitted}
                    mode={mode}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
