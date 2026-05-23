import { useState, useRef, useEffect } from 'react';

export default function MovieSlot({ slot, movie, isWinner, isLoser, onClick, submitted }) {
  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);
  const btnRef = useRef(null);

  function handleMouseEnter() {
    if (!slot.movieId) return;
    timerRef.current = setTimeout(() => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceRight = window.innerWidth - rect.right;
      const pos = spaceRight >= 252
        ? { top: rect.top, left: rect.right + 6 }
        : { top: rect.top, left: rect.left - 252 };
      setTooltip(pos);
    }, 2000);
  }

  function handleMouseLeave() {
    clearTimeout(timerRef.current);
    setTooltip(null);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!slot.movieId) {
    return (
      <div className="actor-slot empty">
        <span>TBD</span>
      </div>
    );
  }

  const rt      = movie?.rt_score != null ? `${movie.rt_score}%` : null;
  const oscWins = movie?.oscar_wins > 0   ? `🏆${movie.oscar_wins}` : null;
  const meta    = [rt, oscWins].filter(Boolean).join(' · ');

  return (
    <>
      <button
        ref={btnRef}
        className={`actor-slot ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}`}
        onClick={onClick}
        disabled={submitted}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {movie?.poster_url && (
          <img src={movie.poster_url} alt={movie.title} className="actor-photo" />
        )}
        <div className="actor-info">
          <div className="actor-name">{movie?.title ?? slot.movieId}</div>
          <div className="film-info">
            <span className="film-title">{movie?.year ?? ''}</span>
            {meta && <span className="film-meta">{meta}</span>}
          </div>
        </div>
      </button>

      {tooltip && (
        <div className="slot-tooltip" style={{ top: tooltip.top, left: tooltip.left }}>
          {movie?.poster_url && (
            <img src={movie.poster_url} alt={movie.title} className="slot-tooltip-photo" />
          )}
          <div className="slot-tooltip-body">
            <div className="slot-tooltip-name">{movie?.title ?? slot.movieId}</div>
            <div className="slot-tooltip-film">
              <span>
                {movie?.year}
                {movie?.director ? ` · Dir. ${movie.director}` : ''}
              </span>
              {rt && <span>🍅 {rt}</span>}
              {movie?.oscar_wins > 0 && (
                <span>Oscars: {movie.oscar_wins}W / {movie.oscar_nominations}N</span>
              )}
              {movie?.box_office && (
                <span>Box office: ${Math.round(movie.box_office / 1_000_000)}M</span>
              )}
            </div>
            {movie?.score != null && (
              <div className="slot-tooltip-meta">Score: {movie.score}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
