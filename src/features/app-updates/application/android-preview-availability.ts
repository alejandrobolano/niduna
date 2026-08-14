export function canOfferAndroidPreview(
  platform: string,
  userAgent?: string,
): boolean {
  if (platform === 'android') {
    return true;
  }

  return platform === 'web' && /\bAndroid\b/i.test(userAgent ?? '');
}
