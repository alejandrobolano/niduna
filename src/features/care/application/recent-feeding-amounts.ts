const recentFeedingAmountLimit = 3;

export function selectRecentFeedingAmounts(
  amounts: ReadonlyArray<number | null>,
): number[] {
  const recentAmounts = amounts
    .filter((amount): amount is number => amount !== null && amount > 0)
    .slice(0, recentFeedingAmountLimit);

  return [...new Set(recentAmounts)];
}
