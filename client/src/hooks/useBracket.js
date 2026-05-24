/**
 * useBracket — manages the full actor-bracket lifecycle for one era:
 *   fetch from API → dispatch picks → submit → show vote results.
 *
 * Keeping this logic out of App lets the component focus on layout/UI
 * and makes the data layer independently testable.
 */
import { useState, useEffect, useReducer } from 'react';
import { selectWinner, allPicksMade, collectPicks } from '../bracketUtils';

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':          return action.state;
    case 'SELECT_WINNER': return selectWinner(state, action.matchupId, action.slotIndex);
    default:              return state;
  }
}

export function useBracket(era) {
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [bracketId,   setBracketId]   = useState(null);
  const [state,       dispatch]       = useReducer(reducer, null);
  const [submitted,   setSubmitted]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [voteResults, setVoteResults] = useState(null);

  // Re-fetch whenever the era changes; cancel in-flight requests on cleanup.
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setSubmitted(false);
    setVoteResults(null);
    setSubmitError(null);

    const url = era.slug === 'alltime'
      ? '/api/bracket'
      : `/api/bracket?era=${encodeURIComponent(era.slug)}`;

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (cancelled) return;
        dispatch({ type: 'INIT', state: data });
        setBracketId(data.bracketId ?? `actors-${data.date}`);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [era]);

  const complete = state ? allPicksMade(state.matchups) : false;

  function pick(matchupId, slotIndex) {
    dispatch({ type: 'SELECT_WINNER', matchupId, slotIndex });
  }

  async function submit(userName) {
    if (!userName || submitting || !state || !bracketId) return;

    const picks = collectPicks(state.matchups);
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/votes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: userName, picks, bracketId, mode: 'actors' }),
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
    loading, error, state, bracketId,
    submitted, submitting, submitError, voteResults,
    complete, pick, submit,
  };
}
