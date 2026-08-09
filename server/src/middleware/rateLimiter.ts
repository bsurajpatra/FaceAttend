import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

/**
 * Strict rate limiter for unauthenticated & sensitive authentication endpoints.
 * Target: Login, Register, Forgot Password, Reset Password, OTP verification.
 * Limit: 15 requests per 15 minutes per IP address.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { message: 'Too many login or authentication attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter for standard management routes.
 * Target: General API requests (students, timetable, reports, session management).
 * Limit: 1000 requests per 15 minutes per IP.
 * Skips high-frequency attendance frame ingestion endpoints (/api/attendance/mark*).
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { message: 'Too many requests, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request): boolean => {
    // Exempt attendance frame marking endpoints from naive IP rate limiting.
    // These high-frequency endpoints are authenticated & trusted-device protected,
    // and rely on BullMQ queue-depth checking for system load backpressure.
    return req.originalUrl.includes('/api/attendance/mark');
  },
});

/**
 * High-capacity rate limiter specifically for attendance frame marking endpoints.
 * Keyed by Faculty User ID or Device ID (falling back to IP), allowing high-frequency frame streams.
 * Limit: 10,000 requests per 15 minutes (sufficient for multi-kiosk 60-minute classes).
 */
export const attendanceFrameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,
  message: { message: 'Attendance frame rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const userId = req.userId;
    const deviceId = req.header('X-Device-Id');
    if (userId) return `user:${userId}`;
    if (deviceId) return `device:${deviceId}`;
    return req.ip || 'unknown-client';
  },
});
