import { Request } from 'express';

// Keys that contain sensitive biometric data
const BIOMETRIC_KEYS = new Set([
  'faceimagebase64',
  'faceimage',
  'image',
  'photo',
  'photobase64',
  'facedescriptor',
  'embedding',
  'embeddings',
]);

// Keys that contain sensitive auth or personal credential data
const CREDENTIAL_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-device-id',
  'password',
  'oldpassword',
  'newpassword',
  'otp',
  'token',
  'secret',
  'refresh-token',
]);

/**
 * Recursively deep-clone and redact sensitive keys from any payload (objects, arrays, headers).
 */
export function sanitizePayload(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    // If array of numbers (e.g. 512-dim embedding vector), replace with array metadata
    if (data.length > 20 && data.every(item => typeof item === 'number')) {
      return `[REDACTED_EMBEDDING_VECTOR: length=${data.length}]`;
    }
    return data.map(item => sanitizePayload(item));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (BIOMETRIC_KEYS.has(lowerKey)) {
      if (typeof value === 'string' && value.length > 50) {
        sanitized[key] = `[REDACTED_BIOMETRIC_IMAGE: len=${value.length}]`;
      } else if (Array.isArray(value)) {
        sanitized[key] = `[REDACTED_BIOMETRIC_VECTOR: len=${value.length}]`;
      } else {
        sanitized[key] = '[REDACTED_BIOMETRIC_DATA]';
      }
    } else if (CREDENTIAL_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const logger = {
  info: (message: string, meta?: any) => {
    if (meta !== undefined) {
      console.log(`ℹ️ [INFO] ${message}`, sanitizePayload(meta));
    } else {
      console.log(`ℹ️ [INFO] ${message}`);
    }
  },

  warn: (message: string, meta?: any) => {
    if (meta !== undefined) {
      console.warn(`⚠️ [WARN] ${message}`, sanitizePayload(meta));
    } else {
      console.warn(`⚠️ [WARN] ${message}`);
    }
  },

  error: (message: string, meta?: any) => {
    if (meta !== undefined) {
      console.error(`❌ [ERROR] ${message}`, sanitizePayload(meta));
    } else {
      console.error(`❌ [ERROR] ${message}`);
    }
  },

  /**
   * Safely log HTTP request context without leaking raw headers or body payloads
   */
  logRequest: (tag: string, req: Request, customMeta?: Record<string, any>) => {
    const safeContext = {
      tag,
      path: req.originalUrl || req.path,
      method: req.method,
      facultyId: req.userId || 'unauthenticated',
      hasBody: !!req.body && Object.keys(req.body).length > 0,
      ...customMeta,
      bodySummary: req.body ? sanitizePayload(req.body) : undefined,
    };
    console.log(`📥 [REQUEST] ${tag}`, safeContext);
  },
};
