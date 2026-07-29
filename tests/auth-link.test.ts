import { describe, expect, it } from 'vitest';

import { parseAuthLink } from '../src/features/auth/infrastructure/auth-link';

describe('authentication links', () => {
  it('reads a token hash callback', () => {
    expect(
      parseAuthLink('https://niduna.com/?token_hash=hash-value&type=email'),
    ).toEqual({
      accessToken: undefined,
      code: undefined,
      refreshToken: undefined,
      tokenHash: 'hash-value',
    });
  });

  it('reads an implicit session from a URL fragment', () => {
    expect(
      parseAuthLink(
        'niduna://#access_token=access-value&refresh_token=refresh-value',
      ),
    ).toEqual({
      accessToken: 'access-value',
      code: undefined,
      refreshToken: 'refresh-value',
      tokenHash: undefined,
    });
  });

  it('ignores regular application links', () => {
    expect(parseAuthLink('https://niduna.com/')).toEqual({
      accessToken: undefined,
      code: undefined,
      refreshToken: undefined,
      tokenHash: undefined,
    });
  });
});
