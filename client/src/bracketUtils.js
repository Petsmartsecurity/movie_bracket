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

// Recursively remove an actor from all downstream matchups they were placed into
function clearDownstream(matchups, fromMatchupId, actorId) {
  const next = getNextSlot(fromMatchupId);
  if (!next) return matchups;

  const nextMatchup = matchups[next.id];
  if (!nextMatchup) return matchups;
  if (nextMatchup.slots[next.slot]?.actorId !== actorId) return matchups;

  let updated = { ...matchups };

  // If they also won the next matchup, keep clearing further down
  if (nextMatchup.winnerId === actorId) {
    updated = clearDownstream(updated, next.id, actorId);
  }

  const newSlots = [...nextMatchup.slots];
  newSlots[next.slot] = { actorId: null, film: null };
  updated[next.id] = { ...nextMatchup, slots: newSlots, winnerId: null };

  return updated;
}

export function selectWinner(state, matchupId, slotIndex) {
  const matchup = state.matchups[matchupId];
  const newWinner = matchup.slots[slotIndex];
  if (!newWinner.actorId) return state;
  if (matchup.winnerId === newWinner.actorId) return state;

  let newMatchups = { ...state.matchups };

  // Clear old winner's downstream picks before placing new winner
  if (matchup.winnerId) {
    newMatchups = clearDownstream(newMatchups, matchupId, matchup.winnerId);
  }

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

  return { ...state, matchups: newMatchups };
}

export function isComplete(matchups) {
  return Object.values(matchups).every(m =>
    m.slots.every(s => s.actorId === null || s.actorId !== null) && // both slots filled or TBD
    (m.slots.some(s => s.actorId === null) || m.winnerId !== null)  // either TBD or decided
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
