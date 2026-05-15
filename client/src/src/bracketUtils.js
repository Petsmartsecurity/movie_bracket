export const DIVISIONS = ['East', 'West', 'South', 'Midwest'];
export const MIN_FILMS = 6;
export const BRACKET_SIZE = 64;

function avgRating(actor) {
  const ratings = actor.films.filter(f => f.imdb_rating).map(f => f.imdb_rating);
  if (!ratings.length) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

export function seedActors(allActors) {
  return allActors
    .filter(a => a.films && a.films.length >= MIN_FILMS)
    .map(a => ({ ...a, avgRating: avgRating(a) }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, BRACKET_SIZE);
}

// Snake seeding across 4 divisions: groups of 4 alternate E,W,S,M / M,S,W,E
export function assignDivisions(seededActors) {
  const divActors = [[], [], [], []];
  const order = [[0, 1, 2, 3], [3, 2, 1, 0]];
  seededActors.forEach((actor, i) => {
    const group = Math.floor(i / 4);
    const pos = i % 4;
    const divIndex = order[group % 2][pos];
    divActors[divIndex].push({ ...actor, seed: group + 1 });
  });
  divActors.forEach(d => d.sort((a, b) => a.seed - b.seed));
  return divActors;
}

// 1v16, 2v15, 3v14, 4v13, 5v12, 6v11, 7v10, 8v9
const R1_PAIRS = [[0,15],[1,14],[2,13],[3,12],[4,11],[5,10],[6,9],[7,8]];

function pickFilm(actor, usedIds) {
  const available = actor.films.filter(f => !usedIds.includes(f.tmdb_id));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function initBracket(allActors) {
  const seeded = seedActors(allActors);
  const divisions = assignDivisions(seeded);

  const actorMap = Object.fromEntries(seeded.map(a => [a.imdb_id, a]));
  const usedFilms = Object.fromEntries(seeded.map(a => [a.imdb_id, []]));
  const matchups = {};

  divisions.forEach((divActors, divIndex) => {
    // Round 1: populate matchups
    R1_PAIRS.forEach(([topIdx, botIdx], matchIndex) => {
      const a1 = divActors[topIdx];
      const a2 = divActors[botIdx];
      const film1 = pickFilm(a1, usedFilms[a1.imdb_id]);
      const film2 = pickFilm(a2, usedFilms[a2.imdb_id]);
      if (film1) usedFilms[a1.imdb_id].push(film1.tmdb_id);
      if (film2) usedFilms[a2.imdb_id].push(film2.tmdb_id);

      matchups[`div${divIndex}-r0-m${matchIndex}`] = {
        id: `div${divIndex}-r0-m${matchIndex}`,
        round: 0, divIndex, matchIndex,
        slots: [
          { actorId: a1.imdb_id, film: film1 },
          { actorId: a2.imdb_id, film: film2 },
        ],
        winnerId: null,
      };
    });

    // Rounds 2-4: empty slots
    for (let round = 1; round <= 3; round++) {
      const count = Math.pow(2, 3 - round);
      for (let matchIndex = 0; matchIndex < count; matchIndex++) {
        const id = `div${divIndex}-r${round}-m${matchIndex}`;
        matchups[id] = {
          id, round, divIndex, matchIndex,
          slots: [{ actorId: null, film: null }, { actorId: null, film: null }],
          winnerId: null,
        };
      }
    }
  });

  // Final Four and Championship
  for (let i = 0; i < 2; i++) {
    matchups[`ff-${i}`] = {
      id: `ff-${i}`, round: 4, divIndex: -1, matchIndex: i,
      slots: [{ actorId: null, film: null }, { actorId: null, film: null }],
      winnerId: null,
    };
  }
  matchups['champ'] = {
    id: 'champ', round: 5, divIndex: -1, matchIndex: 0,
    slots: [{ actorId: null, film: null }, { actorId: null, film: null }],
    winnerId: null,
  };

  return {
    actorMap,
    usedFilms,
    matchups,
    divisionActorIds: divisions.map(d => d.map(a => a.imdb_id)),
  };
}

function getNextSlot(matchupId) {
  const divMatch = matchupId.match(/^div(\d+)-r(\d+)-m(\d+)$/);
  if (divMatch) {
    const [, d, r, i] = divMatch.map(Number);
    if (r < 3) return { id: `div${d}-r${r + 1}-m${Math.floor(i / 2)}`, slot: i % 2 };
    if (r === 3) return { id: `ff-${Math.floor(d / 2)}`, slot: d % 2 };
  }
  const ffMatch = matchupId.match(/^ff-(\d+)$/);
  if (ffMatch) return { id: 'champ', slot: Number(ffMatch[1]) };
  return null;
}

export function selectWinner(state, matchupId, slotIndex) {
  const matchup = state.matchups[matchupId];
  const winner = matchup.slots[slotIndex];
  if (!winner.actorId || matchup.winnerId) return state;

  const newMatchups = {
    ...state.matchups,
    [matchupId]: { ...matchup, winnerId: winner.actorId },
  };

  const next = getNextSlot(matchupId);
  if (next) {
    const actor = state.actorMap[winner.actorId];
    const used = state.usedFilms[winner.actorId] || [];
    const film = pickFilm(actor, used);

    const newUsedFilms = {
      ...state.usedFilms,
      [winner.actorId]: film ? [...used, film.tmdb_id] : used,
    };

    const nextMatchup = newMatchups[next.id];
    const newSlots = [...nextMatchup.slots];
    newSlots[next.slot] = { actorId: winner.actorId, film };
    newMatchups[next.id] = { ...nextMatchup, slots: newSlots };

    return { ...state, matchups: newMatchups, usedFilms: newUsedFilms };
  }

  return { ...state, matchups: newMatchups };
}
