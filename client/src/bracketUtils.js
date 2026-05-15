export const DIVISIONS = ['East', 'West', 'South', 'Midwest'];

function getNextSlot(matchupId) {
  const divMatch = matchupId.match(/^div(\d+)-r(\d+)-m(\d+)$/);
  if (divMatch) {
    const [, d, r, i] = divMatch.map(Number);
    if (r < 3) return { id: `div${d}-r${r + 1}-m${Math.floor(i / 2)}`, slot: i % 2, round: r + 1 };
    if (r === 3) return { id: `ff-${Math.floor(d / 2)}`, slot: d % 2, round: 4 };
  }
  const ffMatch = matchupId.match(/^ff-(\d+)$/);
  if (ffMatch) return { id: 'champ', slot: Number(ffMatch[1]), round: 5 };
  return null;
}

// Returns the matchup ID that feeds into a given slot
function getFeedingMatchupId(matchupId, slotIdx) {
  const divMatch = matchupId.match(/^div(\d+)-r(\d+)-m(\d+)$/);
  if (divMatch) {
    const [, d, r, m] = divMatch.map(Number);
    if (r === 1) return null; // seeded — no upstream matchup
    return `div${d}-r${r - 1}-m${m * 2 + slotIdx}`;
  }
  const ffMatch = matchupId.match(/^ff-(\d+)$/);
  if (ffMatch) return `div${Number(ffMatch[1]) * 2 + slotIdx}-r3-m0`;
  if (matchupId === 'champ') return `ff-${slotIdx}`;
  return null;
}

function getRound(matchupId) {
  const divMatch = matchupId.match(/^div\d+-r(\d+)-m\d+$/);
  if (divMatch) return Number(divMatch[1]);
  if (/^ff-\d+$/.test(matchupId)) return 4;
  if (matchupId === 'champ') return 5;
  return 0;
}

// Walk matchups in round order; clear any slot whose actor didn't win their feeding matchup
function validateSlots(matchups) {
  const ids = Object.keys(matchups).sort((a, b) => getRound(a) - getRound(b));
  let updated = { ...matchups };

  for (const id of ids) {
    const matchup = updated[id];
    let newSlots = null;
    let newWinnerId = matchup.winnerId;

    for (let slotIdx = 0; slotIdx < 2; slotIdx++) {
      const slot = matchup.slots[slotIdx];
      if (!slot.actorId) continue;

      const feedingId = getFeedingMatchupId(id, slotIdx);
      if (!feedingId) continue; // R1 seed — always valid

      const feeder = updated[feedingId];
      if (feeder?.winnerId === slot.actorId) continue; // still valid

      if (!newSlots) newSlots = [...matchup.slots];
      if (newWinnerId === slot.actorId) newWinnerId = null;
      newSlots[slotIdx] = { actorId: null, film: null };
    }

    if (newSlots) {
      updated = { ...updated, [id]: { ...matchup, slots: newSlots, winnerId: newWinnerId } };
    }
  }

  return updated;
}

export function selectWinner(state, matchupId, slotIndex) {
  const matchup = state.matchups[matchupId];
  const newWinner = matchup.slots[slotIndex];
  if (!newWinner.actorId) return state;
  if (matchup.winnerId === newWinner.actorId) return state;

  let newMatchups = { ...state.matchups };
  newMatchups[matchupId] = { ...newMatchups[matchupId], winnerId: newWinner.actorId };

  const next = getNextSlot(matchupId);
  if (next) {
    const actor = state.actorMap[newWinner.actorId];
    const film = actor?.roundFilms?.[next.round] ?? null;
    const nextMatchup = newMatchups[next.id];
    const newSlots = [...nextMatchup.slots];
    newSlots[next.slot] = { actorId: newWinner.actorId, film };
    newMatchups[next.id] = { ...nextMatchup, slots: newSlots };
  }

  // Validate all slots in round order — clears any that no longer have a valid feeder winner
  newMatchups = validateSlots(newMatchups);

  return { ...state, matchups: newMatchups };
}

export function isComplete(matchups) {
  return Object.values(matchups).every(m =>
    m.slots.every(s => s.actorId === null || s.actorId !== null) &&
    (m.slots.some(s => s.actorId === null) || m.winnerId !== null)
  );
}

// Returns true only when every matchup that has both actors filled has a winner
export function allPicksMade(matchups) {
  return Object.values(matchups).every(m => {
    const bothFilled = m.slots.every(s => s.actorId !== null);
    return !bothFilled || m.winnerId !== null;
  });
}

export function collectPicks(matchups) {
  const picks = {};
  for (const [id, m] of Object.entries(matchups)) {
    if (m.winnerId) picks[id] = m.winnerId;
  }
  return picks;
}
