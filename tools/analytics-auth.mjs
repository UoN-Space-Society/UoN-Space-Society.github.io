import { GoogleAuth } from 'google-auth-library';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const defaultKeyFile = join(
  homedir(),
  '.config',
  'spacesoc-analytics',
  'reader.json',
);

export async function getReportingToken(
  env = process.env,
  createAuth = (options) => new GoogleAuth(options),
) {
  if (env.GOOGLE_ACCESS_TOKEN) return env.GOOGLE_ACCESS_TOKEN;
  let token;
  try {
    const auth = createAuth({
      keyFile: env.GOOGLE_APPLICATION_CREDENTIALS || defaultKeyFile,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    token = await auth.getAccessToken();
  } catch {
    // Library errors can include request headers. Never print those credentials.
    throw new Error(
      'Authentication failed. Check the local service-account key and network access. See README.',
    );
  }
  if (!token) throw new Error('No access token returned by Google.');
  return token;
}
