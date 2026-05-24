import { useState } from 'react';
import Bracket from './components/Bracket';
import NameEntry from './components/NameEntry';
import { collectPicks } from './bracketUtils';
import { collectPicksMovie, ERAS, ACTOR_ERAS } from './movieBracketUtils';
import { useBracket } from './hooks/useBracket';
import { useMovieBracket } from './hooks/useMovieBracket';
import './App.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeAgreement(picks, voteResults) {
  if (!voteResults || voteResults.totalVoters < 2) return null;
  let agreed = 0, total = 0;
  for (const [matchupId, winnerId] of Object.entries(picks)) {
    const totals = voteResults.matchupTotals?.[matchupId];
    if (!totals) continue;
    total++;
    const majority = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (majority === winnerId) agreed++;
  }
  return { agreed, total };
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [mode,     setMode]     = useState('actors');
  const [era,      setEra]      = useState(ERAS[0]);
  const [actorEra, setActorEra] = useState(ACTOR_ERAS[0]);
  const [userName, setUserName] = useState(null);

  // Each hook owns its own fetch/dispatch/submit/vote lifecycle.
  const actors = useBracket(actorEra);
  const movies = useMovieBracket(era, mode === 'movies');

  const isActors      = mode === 'actors';
  const bracket       = isActors ? actors : movies;
  const movieBracketId = `movies-${era.slug}`;

  // Agreement score — computed only after submission.
  const agreement = (() => {
    if (!bracket.submitted || !bracket.voteResults || !bracket.state) return null;
    const picks = isActors
      ? collectPicks(bracket.state.matchups)
      : collectPicksMovie(bracket.state.matchups);
    return computeAgreement(picks, bracket.voteResults);
  })();

  function handleSelectWinner(matchupId, slotIndex) {
    bracket.pick(matchupId, slotIndex);
  }

  async function handleSubmit() {
    if (!userName) return;
    if (isActors) await actors.submit(userName);
    else          await movies.submit(userName, movieBracketId);
  }

  // ── Name gate (actors only — name needed before bracket is shown) ──────────
  if (isActors && !userName) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="app-header-left"><h1>Bracket Challenge</h1></div>
          <div className="app-header-right">
            <ModeToggle mode={mode} onSwitch={setMode} />
          </div>
        </header>
        <NameEntry onSubmit={setUserName} />
      </div>
    );
  }

  const title         = isActors ? 'Actor Performance Bracket' : 'Movie Bracket';
  const actorEraLabel = actorEra.slug === 'alltime' ? 'All Time' : actorEra.label;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>{title}</h1>
          <p>
            {isActors
              ? (bracket.submitted
                  ? `Submitted as ${userName} · ${actorEraLabel}`
                  : `${actorEraLabel} · ${userName}`)
              : `Top movies · ${era.label}`}
          </p>
          {agreement && (
            <div className="agreement-badge">
              You matched the majority on{' '}
              <strong>{agreement.agreed}/{agreement.total}</strong> picks
              {bracket.voteResults?.totalVoters > 1
                ? ` · ${bracket.voteResults.totalVoters} total voters`
                : ''}
            </div>
          )}
        </div>

        <div className="app-header-right">
          {/* Era selector */}
          {isActors ? (
            <select
              className="era-select"
              value={actorEra.slug}
              onChange={e => setActorEra(ACTOR_ERAS.find(r => r.slug === e.target.value))}
            >
              {ACTOR_ERAS.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
            </select>
          ) : (
            <select
              className="era-select"
              value={era.label}
              onChange={e => setEra(ERAS.find(r => r.label === e.target.value))}
            >
              {ERAS.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
          )}

          {/* Submit area */}
          {!bracket.submitted && bracket.complete && (
            <>
              {bracket.submitError && (
                <span className="submit-error">{bracket.submitError}</span>
              )}
              {!userName && !isActors ? (
                <NameThenSubmit onName={setUserName} />
              ) : (
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={bracket.submitting}
                >
                  {bracket.submitting ? 'Submitting…' : 'Submit Bracket'}
                </button>
              )}
            </>
          )}
          {bracket.submitted && !agreement && (
            <span className="submitted-badge">✓ Submitted</span>
          )}

          <ModeToggle mode={mode} onSwitch={setMode} />
        </div>
      </header>

      <main className="app-main">
        {bracket.loading && <div className="status-screen">Loading bracket…</div>}
        {!bracket.loading && bracket.error && (
          <div className="status-screen error">Error: {bracket.error}</div>
        )}
        {!bracket.loading && !bracket.error && bracket.state && (
          <Bracket
            state={bracket.state}
            onSelectWinner={handleSelectWinner}
            submitted={bracket.submitted}
            mode={mode}
            voteResults={bracket.voteResults}
          />
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModeToggle({ mode, onSwitch }) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn ${mode === 'actors' ? 'active' : ''}`}
        onClick={() => onSwitch('actors')}
      >Actors</button>
      <button
        className={`mode-btn ${mode === 'movies' ? 'active' : ''}`}
        onClick={() => onSwitch('movies')}
      >Movies</button>
    </div>
  );
}

// Inline name prompt shown when a movie-mode user tries to submit without a name.
function NameThenSubmit({ onName }) {
  const [val, setVal] = useState('');
  return (
    <div className="inline-name">
      <input
        className="name-input inline"
        placeholder="Your name to submit"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && val.trim() && onName(val.trim())}
      />
      <button
        className="submit-btn"
        disabled={!val.trim()}
        onClick={() => onName(val.trim())}
      >Submit</button>
    </div>
  );
}
