// movieBracketUtils.js
// Bracket logic for 32-movie bracket: 4 divisions × 8, 3 rounds (r0-r2), r2 → FF

export const MOVIE_ROUND_LABELS = ['Round 1', 'Round 2', 'Elite 8'];

// Within each 8-movie division, bracket seeding:
// m0: seed 1 vs seed 8  (offsets [0,7])
// m1: seed 4 vs seed 5  (offsets [3,4])
// m2: seed 3 vs seed 6  (offsets [2,5])
// m3: seed 2 vs seed 7  (offsets [1,6])
const DIV_SEED_ORDER = [[0, 7], [3, 4], [2, 5], [1, 6]];

function getNextSlot(matchupId) {
  const divMatch = matchupId.match(/^div(\d+)-r(\d+)-m(\d+)$/);
  if (divMatch) {
    const [, d, r, i] = divMatch.map(Number);
    if (r < 2) return { id: `div${d}-r${r + 1}-m${Math.floor(i / 2)}`, slot: i % 2 };
    if (r === 2) return { id: `ff-${Math.floor(d / 2)}`, slot: d % 2 };
  }
  const ffMatch = matchupId.match(/^ff-(\d+)$/);
  if (ffMatch) return { id: 'champ', slot: Number(ffMatch[1]) };
  return null;
}

function getFeedingMatchupId(matchupId, slotIdx) {
  const divMatch = matchupId.match(/^div(\d+)-r(\d+)-m(\d+)$/);
  if (divMatch) {
    const [, d, r, m] = divMatch.map(Number);
    if (r === 0) return null; // seeded — no upstream matchup
    return `div${d}-r${r - 1}-m${m * 2 + slotIdx}`;
  }
  const ffMatch = matchupId.match(/^ff-(\d+)$/);
  if (ffMatch) return `div${Number(ffMatch[1]) * 2 + slotIdx}-r2-m0`;
  if (matchupId === 'champ') return `ff-${slotIdx}`;
  return null;
}

function getRound(matchupId) {
  const divMatch = matchupId.match(/^div\d+-r(\d+)-m\d+$/);
  if (divMatch) return Number(divMatch[1]);
  if (/^ff-\d+$/.test(matchupId)) return 3;
  if (matchupId === 'champ') return 4;
  return 0;
}

function validateSlots(matchups) {
  const ids = Object.keys(matchups).sort((a, b) => getRound(a) - getRound(b));
  let updated = { ...matchups };

  for (const id of ids) {
    if (getRound(id) < 1) continue;
    const matchup = updated[id];
    let newSlots = null;
    let newWinnerId = matchup.winnerId;

    for (let slotIdx = 0; slotIdx < 2; slotIdx++) {
      const slot = matchup.slots[slotIdx];
      if (!slot.movieId) continue;

      const feedingId = getFeedingMatchupId(id, slotIdx);
      if (!feedingId) continue;

      const feeder = updated[feedingId];
      if (feeder?.winnerId === slot.movieId) continue;

      if (!newSlots) newSlots = [...matchup.slots];
      newWinnerId = null;
      newSlots[slotIdx] = { movieId: null };
    }

    const effectiveSlots = newSlots ?? matchup.slots;
    if (newWinnerId && !effectiveSlots.some(s => s.movieId === newWinnerId)) {
      newWinnerId = null;
    }

    if (newSlots !== null || newWinnerId !== matchup.winnerId) {
      updated = { ...updated, [id]: { ...matchup, slots: effectiveSlots, winnerId: newWinnerId } };
    }
  }

  return updated;
}

export function selectWinnerMovie(state, matchupId, slotIndex) {
  const matchup = state.matchups[matchupId];
  const clicked = matchup.slots[slotIndex];
  if (!clicked.movieId) return state;

  let newMatchups = { ...state.matchups };

  if (matchup.winnerId === clicked.movieId) {
    // Deselect
    newMatchups[matchupId] = { ...newMatchups[matchupId], winnerId: null };
  } else {
    newMatchups[matchupId] = { ...newMatchups[matchupId], winnerId: clicked.movieId };
    const next = getNextSlot(matchupId);
    if (next) {
      const nextMatchup = newMatchups[next.id];
      const newSlots = [...nextMatchup.slots];
      newSlots[next.slot] = { movieId: clicked.movieId };
      newMatchups[next.id] = { ...nextMatchup, slots: newSlots };
    }
  }

  newMatchups = validateSlots(newMatchups);
  return { ...state, matchups: newMatchups };
}

export function allPicksMadeMovie(matchups) {
  return Object.values(matchups).every(m => {
    const bothFilled = m.slots.every(s => s.movieId !== null);
    return !bothFilled || m.winnerId !== null;
  });
}

// Build bracket state from a sorted movies array (first 32 used).
export function buildMovieBracket(movies) {
  const top32 = movies.slice(0, 32);

  // Build movieMap
  const movieMap = {};
  for (const m of top32) {
    movieMap[m.imdb_id] = m;
  }

  const matchups = {};

  // 4 divisions, 8 movies each
  for (let d = 0; d < 4; d++) {
    const divMovies = top32.slice(d * 8, d * 8 + 8);

    // r0: 4 matchups with seeded pairing
    for (let mi = 0; mi < 4; mi++) {
      const [a, b] = DIV_SEED_ORDER[mi];
      matchups[`div${d}-r0-m${mi}`] = {
        id: `div${d}-r0-m${mi}`,
        slots: [
          { movieId: divMovies[a]?.imdb_id ?? null },
          { movieId: divMovies[b]?.imdb_id ?? null },
        ],
        winnerId: null,
      };
    }

    // r1: 2 matchups (empty, filled as winners advance)
    for (let mi = 0; mi < 2; mi++) {
      matchups[`div${d}-r1-m${mi}`] = {
        id: `div${d}-r1-m${mi}`,
        slots: [{ movieId: null }, { movieId: null }],
        winnerId: null,
      };
    }

    // r2: 1 matchup (division final → Elite 8)
    matchups[`div${d}-r2-m0`] = {
      id: `div${d}-r2-m0`,
      slots: [{ movieId: null }, { movieId: null }],
      winnerId: null,
    };
  }

  // Final Four: 2 matchups
  for (let i = 0; i < 2; i++) {
    matchups[`ff-${i}`] = {
      id: `ff-${i}`,
      slots: [{ movieId: null }, { movieId: null }],
      winnerId: null,
    };
  }

  // Championship
  matchups['champ'] = {
    id: 'champ',
    slots: [{ movieId: null }, { movieId: null }],
    winnerId: null,
  };

  return { matchups, movieMap };
}

export function collectPicksMovie(matchups) {
  const picks = {};
  for (const [id, m] of Object.entries(matchups)) {
    if (m.winnerId) picks[id] = m.winnerId;
  }
  return picks;
}

// Available eras for filtering movies (by release year).
// slug is used as part of the bracketId for vote storage.
//
// Split into DECADE_ERAS and YEAR_ERAS so the UI can render them in
// separate <optgroup> sections. ERAS is the combined flat list used
// by filtering logic (start/end range) and slug lookups.

export const DECADE_ERAS = [
  { label: 'All Time',           slug: 'alltime', start: 0,    end: 9999 },
  { label: '2020s',              slug: '2020s',   start: 2020, end: 2029 },
  { label: '2010s',              slug: '2010s',   start: 2010, end: 2019 },
  { label: '2000s',              slug: '2000s',   start: 2000, end: 2009 },
  { label: '1990s',              slug: '1990s',   start: 1990, end: 1999 },
  { label: '1980s',              slug: '1980s',   start: 1980, end: 1989 },
  { label: '1970s',              slug: '1970s',   start: 1970, end: 1979 },
  { label: '1960s',              slug: '1960s',   start: 1960, end: 1969 },
  { label: 'Classic (pre-1960)', slug: 'classic', start: 0,    end: 1959 },
];

// Per-year eras from 2015 onward. movies.json coverage grows over time;
// slots for years with fewer than 32 qualifying movies will show as TBD.
export const YEAR_ERAS = [
  { label: '2025', slug: '2025', start: 2025, end: 2025 },
  { label: '2024', slug: '2024', start: 2024, end: 2024 },
  { label: '2023', slug: '2023', start: 2023, end: 2023 },
  { label: '2022', slug: '2022', start: 2022, end: 2022 },
  { label: '2021', slug: '2021', start: 2021, end: 2021 },
  { label: '2020', slug: '2020', start: 2020, end: 2020 },
  { label: '2019', slug: '2019', start: 2019, end: 2019 },
  { label: '2018', slug: '2018', start: 2018, end: 2018 },
  { label: '2017', slug: '2017', start: 2017, end: 2017 },
  { label: '2016', slug: '2016', start: 2016, end: 2016 },
  { label: '2015', slug: '2015', start: 2015, end: 2015 },
];

export const ERAS = [...DECADE_ERAS, ...YEAR_ERAS];

// Available eras for filtering actors (by peak active decade)
// slug is passed as ?era= query param to /api/bracket
export const ACTOR_ERAS = [
  { label: 'All Time', slug: 'alltime' },
  { label: '2020s',    slug: '2020s'   },
  { label: '2010s',    slug: '2010s'   },
  { label: '2000s',    slug: '2000s'   },
  { label: '1990s',    slug: '1990s'   },
  { label: '1980s',    slug: '1980s'   },
  { label: '1970s',    slug: '1970s'   },
  { label: '1960s',    slug: '1960s'   },
];
