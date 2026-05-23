import { useState, useEffect, useReducer } from 'react';
import Bracket from './components/Bracket';
import NameEntry from './components/NameEntry';
import { selectWinner, allPicksMade, collectPicks } from './bracketUtils';
import { selectWinnerMovie, allPicksMadeMovie, buildMovieBracket, ERAS } from './movieBracketUtils';
import './App.css';

// ── Reducers ──────────────────────────────────────────────────────────────────

function actorReducer(state, action) {
  switch (action.type) {
    case 'INIT':           return action.state;
    case 'SELECT_WINNER':  return selectWinner(state, action.matchupId, action.slotIndex);
    default:               return state;
  }
}

function movieReducer(state, action) {
  switch (action.type) {
    case 'INIT':           return action.state;
    case 'SELECT_WINNER':  return selectWinnerMovie(state, action.matchupId, action.slotIndex);
    default:               return state;
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Mode: 'actors' | 'movies'
  const [mode, setMode] = useState('actors');
  const [era, setEra]   = useState(ERAS[0]); // "All Time" default

  // Actor bracket
  const [actorLoading, setActorLoading] = useState(true);
  const [actorError, setActorError]     = useState(null);
  const [actorState, actorDispatch]     = useReducer(actorReducer, null);

  // Movie bracket
  const [movieLoading, setMovieLoading] = useState(false);
  const [movieError, setMovieError]     = useState(null);
  const [movieState, movieDispatch]     = useReducer(movieReducer, null);
  const [allMovies, setAllMovies]       = useState(null); // full movies.json cache

  // Shared
  const [userName, setUserName]       = useState(null);
  const [submitted, setSubmitted]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── Load actor bracket from API ────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/bracket')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { actorDispatch({ type: 'INIT', state: data }); setActorLoading(false); })
      .catch(err => { setActorError(err.message); setActorLoading(false); });
  }, []);

  // ── Load movies.json once, then rebuild bracket when era changes ───────────
  useEffect(() => {
    if (mode !== 'movies') return;
    if (allMovies) {
      rebuildMovieBracket(allMovies, era);
      return;
    }
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
    if (allMovies) rebuildMovieBracket(allMovies, era);
  }, [era]); // eslint-disable-line react-hooks/exhaustive-deps

  function rebuildMovieBracket(movies, selectedEra) {
    const filtered = movies
      .filter(m => m.year >= selectedEra.start && m.year <= selectedEra.end)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const bracketState = buildMovieBracket(filtered);
    movieDispatch({ type: 'INIT', state: bracketState });
  }

  // ── Submit (actors only) ──────────────────────────────────────────────────
  async function handleSubmit() {
    if (!actorState || !userName || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userName, picks: collectPicks(actorState.matchups) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const isActors  = mode === 'actors';
  const loading   = isActors ? actorLoading  : movieLoading;
  const error     = isActors ? actorError    : movieError;
  const curState  = isActors ? actorState    : movieState;
  const complete  = isActors
    ? (actorState && allPicksMade(actorState.matchups))
    : (movieState && allPicksMadeMovie(movieState.matchups));

  function handleSelectWinner(id, slot) {
    if (isActors) actorDispatch({ type: 'SELECT_WINNER', matchupId: id, slotIndex: slot });
    else          movieDispatch({ type: 'SELECT_WINNER', matchupId: id, slotIndex: slot });
  }

  // ── Name entry gate (only for actors) ─────────────────────────────────────
  if (isActors && !userName) {
    // Show a minimal shell with the mode toggle so they can switch to movies
    // without needing a name
    return (
      <div className="app">
        <header className="app-header">
          <div className="app-header-left">
            <h1>Bracket Challenge</h1>
          </div>
          <div className="app-header-right">
            <ModeToggle mode={mode} onSwitch={m => { setMode(m); setSubmitted(false); }} />
          </div>
        </header>
        <NameEntry onSubmit={setUserName} />
      </div>
    );
  }

  const title = isActors ? 'Actor Performance Bracket' : 'Movie Bracket';

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>{title}</h1>
          <p>
            {isActors
              ? (submitted ? `Submitted as ${userName}` : `Filling out as ${userName}`)
              : `Top movies · ${era.label}`}
          </p>
        </div>

        <div className="app-header-right">
          {/* Era selector (movies only) */}
          {!isActors && (
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

          {/* Submit button (actors only) */}
          {isActors && !submitted && complete && (
            <>
              {submitError && <span className="submit-error">{submitError}</span>}
              <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Bracket'}
              </button>
            </>
          )}
          {isActors && submitted && (
            <span className="submitted-badge">✓ Bracket submitted</span>
          )}

          <ModeToggle mode={mode} onSwitch={m => { setMode(m); setSubmitted(false); }} />
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
          />
        )}
      </main>
    </div>
  );
}

function ModeToggle({ mode, onSwitch }) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn ${mode === 'actors' ? 'active' : ''}`}
        onClick={() => onSwitch('actors')}
      >
        Actors
      </button>
      <button
        className={`mode-btn ${mode === 'movies' ? 'active' : ''}`}
        onClick={() => onSwitch('movies')}
      >
        Movies
      </button>
    </div>
  );
}
