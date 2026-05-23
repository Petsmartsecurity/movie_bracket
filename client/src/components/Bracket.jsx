import Division from './Division';
import Matchup from './Matchup';
import { DIVISIONS } from '../bracketUtils';

export default function Bracket({ state, onSelectWinner, submitted, mode = 'actors', voteResults }) {
  const { matchups } = state;
  const entityMap = mode === 'movies' ? state.movieMap : state.actorMap;

  const winner = matchups['champ']?.winnerId;
  const winnerEntity = winner ? entityMap[winner] : null;
  const winnerName = winnerEntity
    ? (mode === 'movies' ? winnerEntity.title : winnerEntity.name)
    : null;

  const divProps = { matchups, entityMap, onSelectWinner, submitted, mode, voteResults };

  return (
    <div className="bracket">
      <div className="bracket-side left">
        <Division divIndex={0} name={DIVISIONS[0]} {...divProps} />
        <Division divIndex={1} name={DIVISIONS[1]} {...divProps} />
      </div>

      <div className="bracket-center">
        <div className="final-four-label">Final Four</div>
        <div className="final-four">
          <Matchup
            matchup={matchups['ff-0']}
            entityMap={entityMap}
            onSelectWinner={onSelectWinner}
            submitted={submitted}
            mode={mode}
            voteResults={voteResults}
          />
          <div className="championship-wrap">
            <div className="championship-label">Championship</div>
            <Matchup
              matchup={matchups['champ']}
              entityMap={entityMap}
              onSelectWinner={onSelectWinner}
              submitted={submitted}
              mode={mode}
              voteResults={voteResults}
            />
            {winnerName && (
              <div className="champion-banner">
                🏆 {winnerName}
              </div>
            )}
          </div>
          <Matchup
            matchup={matchups['ff-1']}
            entityMap={entityMap}
            onSelectWinner={onSelectWinner}
            submitted={submitted}
            mode={mode}
            voteResults={voteResults}
          />
        </div>
      </div>

      <div className="bracket-side right">
        <Division divIndex={2} name={DIVISIONS[2]} {...divProps} reversed />
        <Division divIndex={3} name={DIVISIONS[3]} {...divProps} reversed />
      </div>
    </div>
  );
}
