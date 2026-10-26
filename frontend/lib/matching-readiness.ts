export function matchingReadiness(matching: { musicians: unknown[]; venues: unknown[] } | null | undefined) {
  const musicians = matching?.musicians.length ?? 0;
  const venues = matching?.venues.length ?? 0;
  return { ready: musicians > 0 && venues > 0, musicians, venues };
}
