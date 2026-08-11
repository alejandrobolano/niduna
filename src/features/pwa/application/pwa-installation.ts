interface PwaEnvironment {
  matchDisplayMode?: (query: string) => { matches: boolean };
  navigatorStandalone?: boolean;
}

export function isPwaStandalone(
  platform: string,
  environment?: PwaEnvironment,
): boolean {
  if (platform !== 'web') {
    return false;
  }

  return Boolean(
    environment?.matchDisplayMode?.('(display-mode: standalone)').matches ||
      environment?.navigatorStandalone,
  );
}
