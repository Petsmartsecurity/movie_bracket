import Division from './Division';
import Matchup from './Matchup';
import { DIVISIONS } from '../bracketUtils';

export default function Bracket({ state, onSelectWinner, submitted }) {
  const { matchups, actorMap } = state;

  return (
    <div className="bracket">
      <div className="bracket-side left">
        <Division divIndex={0} name={DIVISIONS[0]} matchups={matchups} actorMap={actorMap} onSelectWinner={onSelectWinner} submitted={submitted} />
        <Division divIndex={1} name={DIVISIONS[1]} matchups={matchups} actorMap={actorMap} onSelectWinner={onSelectWinner} submitted={submitted} />
      </div>

      <div className="bracket-center">
        <div className="final-four-label">Final Four</div>
        <div className="final-four">
          <Matchup matchup={matchups['ff-0']} actorMap={actorMap} onSelectWinner={onSelectWinner} submitted={submitted} />
          <div className="championship-wrap">
            <div className="championship-label">Championship</div>
            <Matchup matchup={matchups['champ']} actorMap={actorMap} onSelectWinner={onSelectWinner} submitted={submitted} />
            {matchups['champ'].winnerId && (
              <div className="champion-banner">
                🏆 {actorMap[matchups['champ'].winnerId]?.name}
              </div>
            )}
          </div>
          <Matchup matchup={matchups['ff-1']} actorMap={actorMap} onSelectWinner={onSelectWinner} submitted={submitted} />
        </div>
      </div>

      <div className="bracket-side right">
        <Division divIndex={2} name={DIVISIONS[2]} matchups={matchups} actorMap={actorMap} onSelectWinner={onSelectWinner} reversed submitted={submitted} />
        <Division divIndex={3} name={DIVISIONS[3]} matchups={matchups} actorMap={actorMap} onSelectWinner={onSelectWinner} reversed submitted={submitted} />
      </div>
    </div>
  );
}
