import Division from './Division';
import Matchup from './Matchup';
import { DIVISIONS } from '../bracketUtils';

export default function Bracket({ state, onSelectWinner }) {
  const { matchups, actorMap } = state;

  return (
    <div className="bracket">
      {/* Left side: East (0) + West (1) */}
      <div className="bracket-side left">
        <Division divIndex={0} name={DIVISIONS[0]} matchups={matchups} actorMap={actorMap} onSelectWinner={onSelectWinner} />
        <Division divIndex={1} name={DIVISIONS[1]} matchups={matchups} actorMap={actorMap} onSelectWinner={onSelectWinner} />
      </div>

      {/* Center: Final Four + Championship */}
      <div className="bracket-center">
        <div className="final-four-label">Final Four</div>
        <div className="final-four">
          <Matchup matchup={matchups['ff-0']} actorMap={actorMap} onSelectWinner={onSelectWinner} />
          <div className="championship-wrap">
            <div className="championship-label">Championship</div>
            <Matchup matchup={matchups['champ']} actorMap={actorMap} onSelectWinner={onSelectWinner} />
            {matchups['champ'].winnerId && (
              <div className="champion-banner">
                🏆 {actorMap[matchups['champ'].winnerId]?.name}
              </div>
            )}
          </div>
          <Matchup matchup={matchups['ff-1']} actorMap={actorMap} onSelectWinner={onSelectWinner} />
        </div>
      </div>

      {/* Right side: South (2) + Midwest (3), rounds reversed */}
      <div className="bracket-side right">
        <Division divIndex={2} name={DIVISIONS[2]} matchups={matchups} actorMap={actorMap} onSelectWinner={onSelectWinner} reversed />
        <Division divIndex={3} name={DIVISIONS[3]} matchups={matchups} actorMap={actorMap} onSelectWinner={onSelectWinner} reversed />
      </div>
    </div>
  );
}
