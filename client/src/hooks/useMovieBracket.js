/**
 * useMovieBracket — manages the movie-bracket lifecycle for one era:
 *   lazy-fetch movies.json (once) → filter by era → dispatch picks → submit.
 *
 * movies.json is held in a ref so switching eras only re-filters in memory;
 * it is never re-downloaded for the lifetime of the component tree.
 */
import { useState, useEffect, useReducer, useRef } from 'react';
import {
  selectWinnerMovie, allPicksMadeMovie,
  buildMovieBracket, collectPicksMovie,
} from '../movieBracketUtils';

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':          return action.state;
    case 'SELECT_WINNER': return selectWinnerMovie(state, action.matchupId, action.slotIndex);
    default:              return state;
  }
}

export function useMovieBracket(era, active) {
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [state,       dispatch]       = useReducer(reducer, null);
  const moviesRef                     = useRef(null); // persistent cache across era changes

  const [submitted,   setSubmitted]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [voteResults, setVoteResults] = useState(null);

  function buildBracket(movies, selectedEra) {
    const filtered = movies
      .filter(m => m.year >= selectedEra.start && m.year <= selectedEra.end)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    dispatch({ type: 'INIT', state: buildMovieBracket(filtered) });
  }

  // Fetch movies.json once when mode first becomes active; rebuild on subsequent activations.
  useEffect(() => {
    if (!active) return;
    if (moviesRef.current) {
      buildBracket(moviesRef.current, era);
      return;
    }
    setLoading(true);
    setError(null);
    fetch('/movies.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const movies = data.movies ?? data;
        moviesRef.current = movies;
        buildBracket(movies, era);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild (in-memory only) when era changes after movies are loaded.
  useEffect(() => {
    if (!active || !moviesRef.current) return;
    buildBracket(moviesRef.current, era);
    setSubmitted(false);
    setVoteResults(null);
    setSubmitError(null);
  }, [era]); // eslint-disable-line react-hooks/exhaustive-deps

  const complete = state ? allPicksMadeMovie(state.matchups) : false;

  function pick(matchupId, slotIndex) {
    dispatch({ type: 'SELECT_WINNER', matchupId, slotIndex });
  }

  async function submit(userName, bracketId) {
    if (!userName || submitting || !state || !bracketId) return;

    const picks = collectPicksMovie(state.matchups);
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/votes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: userName, picks, bracketId, mode: 'movies' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setSubmitted(true);
      const voteRes = await fetch(`/api/votes?bracketId=${encodeURIComponent(bracketId)}`);
      if (voteRes.ok) setVoteResults(await voteRes.json());
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    loading, error, state,
    submitted, submitting, submitError, voteResults,
    complete, pick, submit,
  };
}
