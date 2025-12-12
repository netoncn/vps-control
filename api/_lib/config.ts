export type AppConfig = {
  corsOrigin: string;
  auth: {
    enabled: boolean;
    jwtSecret: string;
    username: string;
    passwordHash: string;
  };
  ssh: {
    host: string;
    port: number;
    username: string;
    privateKey?: Buffer;
    password?: string;
    passphrase?: string;
    timeoutMs: number;
  };
};

export function loadConfig(): AppConfig {
  const {
    CORS_ORIGIN,
    AUTH_ENABLED,
    AUTH_JWT_SECRET,
    AUTH_USERNAME,
    AUTH_PASSWORD_HASH,
    VPS_HOST,
    VPS_PORT,
    VPS_USERNAME,
    VPS_PRIVATE_KEY,
    VPS_PASSWORD,
    VPS_PRIVATE_KEY_PASSPHRASE,
    SSH_CONNECT_TIMEOUT_MS,
  } = process.env;

  if (!VPS_HOST || !VPS_USERNAME) {
    throw new Error('Missing VPS_HOST or VPS_USERNAME environment variables');
  }

  // Na Vercel, a chave privada vem como string (base64 ou texto)
  const privateKey = VPS_PRIVATE_KEY
    ? Buffer.from(VPS_PRIVATE_KEY, 'base64')
    : undefined;

  const authEnabled = AUTH_ENABLED === 'true';

  return {
    corsOrigin: CORS_ORIGIN || '*',
    auth: {
      enabled: authEnabled,
      jwtSecret: AUTH_JWT_SECRET || 'change-this-secret-in-production',
      username: AUTH_USERNAME || 'admin',
      passwordHash: AUTH_PASSWORD_HASH || '',
    },
    ssh: {
      host: VPS_HOST,
      port: VPS_PORT ? Number(VPS_PORT) : 22,
      username: VPS_USERNAME,
      privateKey,
      password: VPS_PASSWORD || undefined,
      passphrase: VPS_PRIVATE_KEY_PASSPHRASE || undefined,
      timeoutMs: SSH_CONNECT_TIMEOUT_MS ? Number(SSH_CONNECT_TIMEOUT_MS) : 15000,
    },
  };
}
