const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

export const RETIRED_CARE_RETENTION_DAYS = 30;

export interface CareRecordRetention {
  daysRemaining: number;
  expiresAt: string;
  isExpired: boolean;
}

export function getCareRecordRetention(
  deletedAt: string | undefined,
  now = new Date(),
): CareRecordRetention | undefined {
  if (!deletedAt) {
    return undefined;
  }

  const deletedAtMilliseconds = Date.parse(deletedAt);
  const nowMilliseconds = now.getTime();

  if (!Number.isFinite(deletedAtMilliseconds) || !Number.isFinite(nowMilliseconds)) {
    return undefined;
  }

  const expiresAtMilliseconds =
    deletedAtMilliseconds + RETIRED_CARE_RETENTION_DAYS * DAY_MILLISECONDS;
  const remainingMilliseconds = expiresAtMilliseconds - nowMilliseconds;

  return {
    daysRemaining: Math.max(0, Math.ceil(remainingMilliseconds / DAY_MILLISECONDS)),
    expiresAt: new Date(expiresAtMilliseconds).toISOString(),
    isExpired: remainingMilliseconds <= 0,
  };
}
