import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireNumberEnv(name: string): number {
  const raw = requireEnv(name);
  const num = Number(raw);
  if (Number.isNaN(num)) {
    throw new Error(`Environment variable ${name} must be a number. Received: ${raw}`);
  }
  return num;
}

function optionalNumberEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value || value.trim() === '') return defaultValue;
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}

export const env = {
  port: requireNumberEnv('PORT'),
  mongoUri: requireEnv('MONGODB_URI'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: requireEnv('JWT_EXPIRES_IN'),
  allowLan8081: process.env.ALLOW_LAN_8081 === 'true',
  emailUser: requireEnv('EMAIL_USER'),
  emailPass: requireEnv('EMAIL_PASS'),
  clientUrl: requireEnv('CLIENT_URL'),
  redisUrl: requireEnv('REDIS_URL'),
  detectionThreshold: optionalNumberEnv('DETECTION_THRESHOLD', 2),
  detectionWindow: optionalNumberEnv('DETECTION_WINDOW_SECONDS', 3),
  faceMatchThreshold: optionalNumberEnv('FACE_MATCH_THRESHOLD', 0.6),
} as const;

/**
 * Startup sanity check ensuring all required env vars are bound and valid
 */
export function verifyEnvIntegrity(): void {
  const missingKeys = Object.entries(env)
    .filter(([_, val]) => val === undefined || val === null || val === '')
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(`Environment config integrity check failed for keys: ${missingKeys.join(', ')}`);
  }
}



