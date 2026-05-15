import { useState, useEffect, useReducer } from 'react';
import Bracket from './components/Bracket';
import NameEntry from './components/NameEntry';
import { selectWinner, allPicksMade, collectPicks } from './bracketUtils';
import './App.css';

function bracketReducer(state, action) {
  switch (action.type) {
    case 'INIT':    return action.state;
    case 'SELECT_WINNER': return selectWinner(state, action.matchupId, action.slotIndex);
    default:        return state;
  }
}

export default function App() {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [bracketState, dispatch]    = useReducer(bracketReducer, null);
  const [userName, setUserName]     = useState(null);
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    fetch('/api/bracket')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { dispatch({ type: 'INIT', state: data }); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  async function handleSubmit() {
    if (!bracketState || !userName || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userName, picks: collectPicks(bracketState.matchups) }),
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

  if (loading) return <div className="status-screen">Loading bracket...</div>;
  if (error)   return <div className="status-screen error">Error: {error}</div>;
  if (!userName) return <NameEntry onSubmit={setUserName} />;

  const complete = bracketState && allPicksMade(bracketState.matchups);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>Movie Performance Bracket</h1>
          <p>{submitted ? `Submitted as ${userName}` : `Filling out as ${userName}`}</p>
        </div>
        {!submitted && complete && (
          <div className="app-header-right">
            {submitError && <span className="submit-error">{submitError}</span>}
            <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Bracket'}
            </button>
          </div>
        )}
        {submitted && (
          <div className="app-header-right">
            <span className="submitted-badge">✓ Bracket submitted</span>
          </div>
        )}
      </header>
      <main className="app-main">
        <Bracket
          state={bracketState}
          onSelectWinner={(id, slot) => dispatch({ type: 'SELECT_WINNER', matchupId: id, slotIndex: slot })}
          submitted={submitted}
        />
      </main>
    </div>
  );
}
