export interface AuthenticationMethodReference {
  method?: string;
  timestamp?: number;
}

export function hasRecentOtpAuthentication(
  methods: AuthenticationMethodReference[] | undefined,
  nowSeconds: number,
  maximumAgeSeconds: number,
): boolean {
  const latestOtpTimestamp = Math.max(
    ...(methods ?? [])
      .filter((method) => method.method === 'otp')
      .map((method) => method.timestamp)
      .filter((timestamp): timestamp is number => typeof timestamp === 'number'),
    0,
  );

  if (latestOtpTimestamp === 0) {
    return false;
  }

  const ageSeconds = nowSeconds - latestOtpTimestamp;
  return ageSeconds >= -30 && ageSeconds <= maximumAgeSeconds;
}
