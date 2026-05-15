import { useState } from 'react';

export default function NameEntry({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div className="name-entry-overlay">
      <div className="name-entry-card">
        <h2>Movie Performance Bracket</h2>
        <p>Enter your name to start filling out today's bracket.</p>
        <form onSubmit={handleSubmit}>
          <input
            className="name-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            maxLength={50}
          />
          <button className="name-submit-btn" type="submit" disabled={!name.trim()}>
            Start Bracket
          </button>
        </form>
      </div>
    </div>
  );
}
