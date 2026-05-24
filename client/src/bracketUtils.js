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
    if (r === 0) return null; // seeded — no upstream matchup
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
    if (getRound(id) < 1) continue; // r0 actors are seeded — never clear them
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
      newWinnerId = null; // any missing participant invalidates the result
      newSlots[slotIdx] = { actorId: null, film: null };
    }

    // Also clear winnerId if it no longer refers to an actor present in the slots
    // (e.g. a new pick overwrote the slot without touching winnerId)
    const effectiveSlots = newSlots ?? matchup.slots;
    if (newWinnerId && !effectiveSlots.some(s => s.actorId === newWinnerId)) {
      newWinnerId = null;
    }

    if (newSlots !== null || newWinnerId !== matchup.winnerId) {
      updated = { ...updated, [id]: { ...matchup, slots: effectiveSlots, winnerId: newWinnerId } };
    }
  }

  return updated;
}

export function selectWinner(state, matchupId, slotIndex) {
  const matchup = state.matchups[matchupId];
  const clicked = matchup.slots[slotIndex];
  if (!clicked.actorId) return state;

  let newMatchups = { ...state.matchups };

  if (matchup.winnerId === clicked.actorId) {
    // Second click on the current winner — deselect
    newMatchups[matchupId] = { ...newMatchups[matchupId], winnerId: null };
  } else {
    // New winner selected
    newMatchups[matchupId] = { ...newMatchups[matchupId], winnerId: clicked.actorId };

    const next = getNextSlot(matchupId);
    if (next) {
      const actor = state.actorMap[clicked.actorId];
      const film = actor?.roundFilms?.[next.round] ?? null;
      const nextMatchup = newMatchups[next.id];
      const newSlots = [...nextMatchup.slots];
      newSlots[next.slot] = { actorId: clicked.actorId, film };
      newMatchups[next.id] = { ...nextMatchup, slots: newSlots };
    }
  }

  newMatchups = validateSlots(newMatchups);
  return { ...state, matchups: newMatchups };
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
