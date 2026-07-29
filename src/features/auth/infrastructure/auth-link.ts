export interface AuthLinkParameters {
  accessToken?: string;
  code?: string;
  refreshToken?: string;
  tokenHash?: string;
}

function getValue(
  searchParameters: URLSearchParams,
  hashParameters: URLSearchParams,
  name: string,
): string | undefined {
  return searchParameters.get(name) ?? hashParameters.get(name) ?? undefined;
}

export function parseAuthLink(url: string): AuthLinkParameters {
  const parsedUrl = new URL(url);
  const hashParameters = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  return {
    accessToken: getValue(parsedUrl.searchParams, hashParameters, 'access_token'),
    code: getValue(parsedUrl.searchParams, hashParameters, 'code'),
    refreshToken: getValue(parsedUrl.searchParams, hashParameters, 'refresh_token'),
    tokenHash: getValue(parsedUrl.searchParams, hashParameters, 'token_hash'),
  };
}
