// Seeded PRNG (mulberry32) — same seed always produces the same sequence
function seededRng(seed) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(dateStr) {
  // Hash the date string to a 32-bit integer
  let h = 0;
  for (const c of dateStr) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
  return h;
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIVISIONS = ['East', 'West', 'South', 'Midwest'];
const MIN_FILMS = 6;
const BRACKET_SIZE = 64;
const ROUNDS = 6;

// Snake seeding across 4 divisions
function assignDivisions(seeded) {
  const divActors = [[], [], [], []];
  const order = [[0,1,2,3],[3,2,1,0]];
  seeded.forEach((actor, i) => {
    const group = Math.floor(i / 4);
    divActors[order[group % 2][i % 4]].push({ ...actor, seed: group + 1 });
  });
  divActors.forEach(d => d.sort((a, b) => a.seed - b.seed));
  return divActors;
}

const R1_PAIRS = [[0,15],[1,14],[2,13],[3,12],[4,11],[5,10],[6,9],[7,8]];

export function generateDailyBracket(actors, dateStr) {
  const rng = seededRng(dateSeed(dateStr));

  // Seed actors by avg rating, take top 64 with enough films
  const eligible = actors
    .filter(a => a.films && a.films.length >= MIN_FILMS)
    .map(a => {
      const ratings = a.films.filter(f => f.imdb_rating).map(f => f.imdb_rating);
      const avg = ratings.length ? ratings.reduce((x, y) => x + y, 0) / ratings.length : 0;
      return { ...a, avgRating: avg };
    })
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, BRACKET_SIZE);

  const divisions = assignDivisions(eligible);

  // Pre-assign one film per round per actor using the seeded RNG
  // Each actor gets ROUNDS films drawn without replacement from their filmography
  const actorRoundFilms = {};
  for (const actor of eligible) {
    const shuffled = shuffle(actor.films, rng);
    actorRoundFilms[actor.imdb_id] = shuffled.slice(0, ROUNDS).map(f => ({
      tmdb_id: f.tmdb_id,
      title: f.title,
      year: f.year,
      character: f.character,
      imdb_rating: f.imdb_rating,
    }));
  }

  // Build matchup tree
  const matchups = {};

  divisions.forEach((divActors, divIndex) => {
    R1_PAIRS.forEach(([topIdx, botIdx], matchIndex) => {
      const a1 = divActors[topIdx];
      const a2 = divActors[botIdx];
      matchups[`div${divIndex}-r0-m${matchIndex}`] = {
        id: `div${divIndex}-r0-m${matchIndex}`,
        round: 0, divIndex, matchIndex,
        slots: [
          { actorId: a1.imdb_id, film: actorRoundFilms[a1.imdb_id][0] },
          { actorId: a2.imdb_id, film: actorRoundFilms[a2.imdb_id][0] },
        ],
        winnerId: null,
      };
    });

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

  // Actor map (strip full films array to save payload size)
  const actorMap = Object.fromEntries(
    eligible.map(a => [a.imdb_id, {
      imdb_id: a.imdb_id,
      name: a.name,
      photo_url: a.photo_url,
      seed: a.seed,
      oscar_win_count: a.oscar_win_count,
      oscar_nominations: a.oscar_nominations,
      roundFilms: actorRoundFilms[a.imdb_id],
    }])
  );

  return {
    date: dateStr,
    divisions: DIVISIONS,
    divisionActorIds: divisions.map(d => d.map(a => a.imdb_id)),
    actorMap,
    matchups,
  };
}
