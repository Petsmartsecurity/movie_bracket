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
    const film = actor?.roundFilms?.[next.round] ?? null;
    const nextMatchup = newMatchups[next.id];
    const newSlots = [...nextMatchup.slots];
    newSlots[next.slot] = { actorId: winner.actorId, film };
    newMatchups[next.id] = { ...nextMatchup, slots: newSlots };
  }

  return { ...state, matchups: newMatchups };
}
