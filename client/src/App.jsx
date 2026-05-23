import { useState, useEffect, useReducer } from 'react';
import Bracket from './components/Bracket';
import NameEntry from './components/NameEntry';
import { selectWinner, allPicksMade, collectPicks } from './bracketUtils';
import {
  selectWinnerMovie, allPicksMadeMovie, buildMovieBracket,
  collectPicksMovie, ERAS, ACTOR_ERAS,
} from './movieBracketUtils';
import './App.css';

// ── Reducers ──────────────────────────────────────────────────────────────────

function actorReducer(state, action) {
  switch (action.type) {
    case 'INIT':          return action.state;
    case 'SELECT_WINNER': return selectWinner(state, action.matchupId, action.slotIndex);
    default:              return state;
  }
}

function movieReducer(state, action) {
  switch (action.type) {
    case 'INIT':          return action.state;
    case 'SELECT_WINNER': return selectWinnerMovie(state, action.matchupId, action.slotIndex);
    default:              return state;
  }
}

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
  // Mode: 'actors' | 'movies'
  const [mode, setMode]         = useState('actors');
  const [era, setEra]           = useState(ERAS[0]);
  const [actorEra, setActorEra] = useState(ACTOR_ERAS[0]);

  // Actor bracket
  const [actorLoading, setActorLoading] = useState(true);
  const [actorError, setActorError]     = useState(null);
  const [actorState, actorDispatch]     = useReducer(actorReducer, null);
  const [actorBracketId, setActorBracketId] = useState(null);

  // Movie bracket
  const [movieLoading, setMovieLoading] = useState(false);
  const [movieError, setMovieError]     = useState(null);
  const [movieState, movieDispatch]     = useReducer(movieReducer, null);
  const [allMovies, setAllMovies]       = useState(null);

  // Shared
  const [userName, setUserName]       = useState(null);

  // Per-mode submission state
  const [actorSubmitted, setActorSubmitted]   = useState(false);
  const [movieSubmitted, setMovieSubmitted]   = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [submitError, setSubmitError]         = useState(null);

  // Vote results (fetched after submit, per mode)
  const [actorVoteResults, setActorVoteResults] = useState(null);
  const [movieVoteResults, setMovieVoteResults] = useState(null);

  // ── Load actor bracket (re-fetches when actorEra changes) ─────────────────
  useEffect(() => {
    setActorLoading(true);
    setActorError(null);
    const url = actorEra.slug === 'alltime'
      ? '/api/bracket'
      : `/api/bracket?era=${encodeURIComponent(actorEra.slug)}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        actorDispatch({ type: 'INIT', state: data });
        setActorBracketId(data.bracketId ?? `actors-${data.date}`);
        setActorLoading(false);
      })
      .catch(err => { setActorError(err.message); setActorLoading(false); });
  }, [actorEra]);

  // ── Load movies.json, rebuild bracket when era changes ────────────────────
  useEffect(() => {
    if (mode !== 'movies') return;
    if (allMovies) { rebuildMovieBracket(allMovies, era); return; }
    setMovieLoading(true);
    setMovieError(null);
    fetch('/movies.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const movies = data.movies ?? data;
        setAllMovies(movies);
        rebuildMovieBracket(movies, era);
        setMovieLoading(false);
      })
      .catch(err => { setMovieError(err.message); setMovieLoading(false); });
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (allMovies) {
      rebuildMovieBracket(allMovies, era);
      setMovieSubmitted(false);
      setMovieVoteResults(null);
      setSubmitError(null);
    }
  }, [era]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset actor bracket state when era changes
  useEffect(() => {
    setActorSubmitted(false);
    setActorVoteResults(null);
    setSubmitError(null);
  }, [actorEra]); // eslint-disable-line react-hooks/exhaustive-deps

  function rebuildMovieBracket(movies, selectedEra) {
    const filtered = movies
      .filter(m => m.year >= selectedEra.start && m.year <= selectedEra.end)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    movieDispatch({ type: 'INIT', state: buildMovieBracket(filtered) });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!userName || submitting) return;

    const isActors = mode === 'actors';
    const currentState = isActors ? actorState : movieState;
    if (!currentState) return;

    const bracketId = isActors
      ? actorBracketId
      : `movies-${era.slug}`;

    const picks = isActors
      ? collectPicks(currentState.matchups)
      : collectPicksMovie(currentState.matchups);

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userName, picks, bracketId, mode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      if (isActors) setActorSubmitted(true);
      else          setMovieSubmitted(true);

      // Fetch aggregate results for comparison
      const voteRes = await fetch(`/api/votes?bracketId=${encodeURIComponent(bracketId)}`);
      if (voteRes.ok) {
        const voteData = await voteRes.json();
        if (isActors) setActorVoteResults(voteData);
        else          setMovieVoteResults(voteData);
      }
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const isActors    = mode === 'actors';
  const loading     = isActors ? actorLoading  : movieLoading;
  const error       = isActors ? actorError    : movieError;
  const curState    = isActors ? actorState    : movieState;
  const submitted   = isActors ? actorSubmitted : movieSubmitted;
  const voteResults = isActors ? actorVoteResults : movieVoteResults;

  const complete = isActors
    ? (actorState && allPicksMade(actorState.matchups))
    : (movieState && allPicksMadeMovie(movieState.matchups));

  // Agreement summary
  const agreement = (() => {
    if (!submitted || !voteResults || !curState) return null;
    const picks = isActors
      ? collectPicks(curState.matchups)
      : collectPicksMovie(curState.matchups);
    return computeAgreement(picks, voteResults);
  })();

  function handleSelectWinner(id, slot) {
    if (isActors) actorDispatch({ type: 'SELECT_WINNER', matchupId: id, slotIndex: slot });
    else          movieDispatch({ type: 'SELECT_WINNER', matchupId: id, slotIndex: slot });
  }

  function switchMode(newMode) {
    setMode(newMode);
    setSubmitError(null);
  }

  // ── Name gate ─────────────────────────────────────────────────────────────
  if (isActors && !userName) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="app-header-left"><h1>Bracket Challenge</h1></div>
          <div className="app-header-right">
            <ModeToggle mode={mode} onSwitch={switchMode} />
          </div>
        </header>
        <NameEntry onSubmit={setUserName} />
      </div>
    );
  }

  const title = isActors ? 'Actor Performance Bracket' : 'Movie Bracket';
  const actorEraLabel = actorEra.slug === 'alltime' ? 'All Time' : actorEra.label;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>{title}</h1>
          <p>
            {isActors
              ? (submitted
                  ? `Submitted as ${userName} · ${actorEraLabel}`
                  : `${actorEraLabel} · ${userName}`)
              : `Top movies · ${era.label}`}
          </p>
          {agreement && (
            <div className="agreement-badge">
              You matched the majority on{' '}
              <strong>{agreement.agreed}/{agreement.total}</strong> picks
              {voteResults?.totalVoters > 1
                ? ` · ${voteResults.totalVoters} total voters`
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
              {ACTOR_ERAS.map(r => (
                <option key={r.slug} value={r.slug}>{r.label}</option>
              ))}
            </select>
          ) : (
            <select
              className="era-select"
              value={era.label}
              onChange={e => setEra(ERAS.find(r => r.label === e.target.value))}
            >
              {ERAS.map(r => (
                <option key={r.label} value={r.label}>{r.label}</option>
              ))}
            </select>
          )}

          {/* Submit button */}
          {!submitted && complete && (
            <>
              {submitError && <span className="submit-error">{submitError}</span>}
              {!userName && !isActors ? (
                <NameThenSubmit onName={n => { setUserName(n); }} />
              ) : (
                <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Bracket'}
                </button>
              )}
            </>
          )}
          {submitted && !agreement && (
            <span className="submitted-badge">✓ Submitted</span>
          )}

          <ModeToggle mode={mode} onSwitch={switchMode} />
        </div>
      </header>

      <main className="app-main">
        {loading && <div className="status-screen">Loading bracket…</div>}
        {!loading && error && <div className="status-screen error">Error: {error}</div>}
        {!loading && !error && curState && (
          <Bracket
            state={curState}
            onSelectWinner={handleSelectWinner}
            submitted={submitted}
            mode={mode}
            voteResults={voteResults}
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

// Inline name prompt for movie mode when no name is set yet
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
