import { useState, useEffect, useReducer } from 'react';
import Bracket from './components/Bracket';
import { selectWinner } from './bracketUtils';
import './App.css';

function bracketReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return action.state;
    case 'SELECT_WINNER':
      return selectWinner(state, action.matchupId, action.slotIndex);
    default:
      return state;
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bracketState, dispatch] = useReducer(bracketReducer, null);

  useEffect(() => {
    fetch('/api/bracket')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        dispatch({ type: 'INIT', state: data });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function handleSelectWinner(matchupId, slotIndex) {
    dispatch({ type: 'SELECT_WINNER', matchupId, slotIndex });
  }

  if (loading) return <div className="status-screen">Loading bracket...</div>;
  if (error) return <div className="status-screen error">Error: {error}</div>;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Movie Performance Bracket</h1>
        <p>Click a performance to advance the actor</p>
      </header>
      <main className="app-main">
        <Bracket state={bracketState} onSelectWinner={handleSelectWinner} />
      </main>
    </div>
  );
}
