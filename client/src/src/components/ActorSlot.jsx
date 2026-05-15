export default function ActorSlot({ slot, actor, isWinner, isLoser, onClick }) {
  if (!slot.actorId) {
    return (
      <div className="actor-slot empty">
        <span>TBD</span>
      </div>
    );
  }

  return (
    <button
      className={`actor-slot ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}`}
      onClick={onClick}
      disabled={!!isWinner || !!isLoser}
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
  );
}
