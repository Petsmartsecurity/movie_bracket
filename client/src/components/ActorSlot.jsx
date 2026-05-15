import { useState, useRef, useEffect } from 'react';

export default function ActorSlot({ slot, actor, isWinner, isLoser, onClick, submitted }) {
  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);
  const btnRef = useRef(null);

  function handleMouseEnter() {
    if (!slot.actorId) return;
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

  if (!slot.actorId) {
    return (
      <div className="actor-slot empty">
        <span>TBD</span>
      </div>
    );
  }

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
        {actor?.photo_url && (
          <img src={actor.photo_url} alt={actor.name} className="actor-photo" />
        )}
        <div className="actor-info">
          <div className="actor-name">{actor?.name ?? slot.actorId}</div>
          {slot.film && (
            <div className="film-info">
              {slot.film.character ? (
                <>
                  <span className="film-title">as {slot.film.character}</span>
                  <span className="film-title">in {slot.film.title}</span>
                </>
              ) : (
                <span className="film-title">{slot.film.title}</span>
              )}
              <span className="film-meta">
                {slot.film.year}
                {slot.film.imdb_rating ? ` · ★ ${slot.film.imdb_rating}` : ''}
              </span>
            </div>
          )}
        </div>
      </button>

      {tooltip && (
        <div
          className="slot-tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          {actor?.photo_url && (
            <img src={actor.photo_url} alt={actor.name} className="slot-tooltip-photo" />
          )}
          <div className="slot-tooltip-body">
            <div className="slot-tooltip-name">{actor?.name ?? slot.actorId}</div>
            {slot.film && (
              <div className="slot-tooltip-film">
                {slot.film.character && <span>as {slot.film.character}</span>}
                <span>in {slot.film.title}</span>
                <span className="slot-tooltip-meta">
                  {slot.film.year}
                  {slot.film.imdb_rating ? ` · ★ ${slot.film.imdb_rating}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
