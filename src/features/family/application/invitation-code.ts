const invitationCodeLength = 16;

export function normalizeInvitationCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, '').slice(0, invitationCodeLength);
}

export function formatInvitationCode(value: string): string {
  return normalizeInvitationCode(value).match(/.{1,4}/g)?.join('-') ?? '';
}

export function isInvitationCodeComplete(value: string): boolean {
  return /^[0-9A-F]{16}$/.test(normalizeInvitationCode(value));
}
