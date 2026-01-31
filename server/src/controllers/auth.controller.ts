import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Faculty } from '../models/Faculty';
import { env } from '../config/env';
import { getIO } from '../socket';
import { createAuditLog } from '../utils/auditLogger';
import { sendPasswordResetEmail, sendPasswordResetSuccessEmail, sendOTPEmail, sendWelcomeEmail, send2FAEmail } from '../utils/email';
import crypto from 'crypto';

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: '7d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, username, password } = req.body as {
      name: string;
      email: string;
      username: string;
      password: string;
    };

    if (!name || !email || !username || !password) {
      res.status(400).json({ message: 'name, email, username, password are required' });
      return;
    }

    // Check if email already exists
    const existingEmail = await Faculty.findOne({ email });
    if (existingEmail) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    // Check if username already exists
    const existingUsername = await Faculty.findOne({ username });
    if (existingUsername) {
      res.status(409).json({ message: 'Username already taken' });
      return;
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const faculty = await Faculty.create({
      name,
      email,
      username,
      password,
      otp,
      otpExpires,
      isVerified: false
    });

    await sendOTPEmail(email, otp);

    res.status(201).json({
      message: 'Registration successful. Please verify your email with the OTP sent.',
      email: faculty.email
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Audit Log
    createAuditLog({
      action: 'Logout',
      details: 'Faculty manually logged out of their account',
      req
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password, deviceId, deviceName } = req.body as {
      username: string;
      password: string;
      deviceId?: string;
      deviceName?: string;
    };

    if (!username || !password) {
      res.status(400).json({ message: 'username and password are required' });
      return;
    }

    const faculty = await Faculty.findOne({ username });
    if (!faculty) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await faculty.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!faculty.isVerified) {
      if (deviceId) {
        res.status(403).json({
          message: 'Verification pending. Please visit ERP portal to verify your account.',
          email: faculty.email,
          needsVerification: true
        });
        return;
      }

      res.status(403).json({
        message: 'Account not verified. Please verify your email.',
        email: faculty.email,
        needsVerification: true
      });
      return;
    }

    // Skip 2FA for mobile app (identified by deviceId)
    if (faculty.twoFactorEnabled && !deviceId) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins for 2FA

      faculty.otp = otp;
      faculty.otpExpires = otpExpires;
      await faculty.save();

      await send2FAEmail(faculty.email, otp);

      res.json({
        twoFactorRequired: true,
        email: faculty.email,
        message: 'Two-factor authentication required'
      });
      return;
    }

    // Handle device trust
    let currentDeviceTrusted = false;
    if (deviceId && deviceName) {
      const deviceIndex = faculty.devices.findIndex(d => d.deviceId === deviceId);

      if (deviceIndex === -1) {
        // New device
        const isFirstDevice = faculty.devices.length === 0;
        faculty.devices.push({
          deviceId,
          deviceName,
          lastLogin: new Date(),
          isTrusted: isFirstDevice
        });
        currentDeviceTrusted = isFirstDevice;
      } else {
        // Existing device
        faculty.devices[deviceIndex].lastLogin = new Date();
        faculty.devices[deviceIndex].deviceName = deviceName;
        currentDeviceTrusted = faculty.devices[deviceIndex].isTrusted;
      }
      await faculty.save();

      // Notify the client via socket
      try {
        const io = getIO();
        io.to(`faculty_${faculty.id}`).emit('devices_updated', {
          devices: faculty.devices
        });
      } catch (socketErr) {
        console.warn('Socket emission failed for login device update:', socketErr);
      }
    }

    const token = signToken(faculty.id);
    const isFirstLogin = faculty.isFirstLogin;

    if (isFirstLogin) {
      faculty.isFirstLogin = false;
      await faculty.save();
    }

    res.json({
      token,
      isFirstLogin,
      user: {
        id: faculty.id,
        name: faculty.name,
        username: faculty.username,
        email: faculty.email,
        devices: faculty.devices
      },
      currentDeviceTrusted
    });

    // Audit Log
    createAuditLog({
      action: 'Login',
      details: `Faculty logged in from ${deviceName || 'Unknown Device'}`,
      req,
      facultyId: faculty.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
}

export async function getDevices(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const faculty = await Faculty.findById(userId).select('devices');
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ devices: faculty.devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Failed to fetch devices' });
  }
}

export async function revokeDevice(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { deviceId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const faculty = await Faculty.findById(userId);
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    faculty.devices = faculty.devices.filter(d => d.deviceId !== deviceId);
    await faculty.save();

    // Notify the client via socket
    try {
      const io = getIO();
      io.to(`faculty_${userId}`).emit('devices_updated', {
        devices: faculty.devices
      });
      // Also force logout the revoked device
      io.to(`faculty_${userId}`).emit('force_logout', { deviceId });
    } catch (socketErr) {
      console.warn('Socket emission failed for revoke device:', socketErr);
    }

    // Audit Log
    createAuditLog({
      action: 'Device Revoked',
      details: `Revoked access for device ID: ${deviceId}`,
      req
    });

    res.json({ message: 'Device deleted successfully', devices: faculty.devices });
  } catch (error) {
    console.error('Revoke device error:', error);
    res.status(500).json({ message: 'Failed to revoke device' });
  }
}

export async function trustDevice(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { deviceId } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!deviceId) {
      res.status(400).json({ message: 'deviceId is required' });
      return;
    }

    const faculty = await Faculty.findById(userId);
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Set all devices to untrusted, then trust the target one
    faculty.devices.forEach(d => {
      d.isTrusted = d.deviceId === deviceId;
    });

    await faculty.save();

    // Notify the client via socket
    try {
      const io = getIO();
      io.to(`faculty_${userId}`).emit('devices_updated', {
        devices: faculty.devices
      });
    } catch (socketErr) {
      console.warn('Socket emission failed for device trust update:', socketErr);
    }

    // Audit Log
    createAuditLog({
      action: 'Device Trusted',
      details: `Marketed device ${deviceId} as trusted`,
      req
    });

    res.json({ message: 'Device trust status updated', devices: faculty.devices });
  } catch (error) {
    console.error('Trust device error:', error);
    res.status(500).json({ message: 'Failed to trust device' });
  }
}

export async function logoutDevice(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { deviceId } = req.body;

    if (!userId || !deviceId) {
      res.status(400).json({ message: 'Unauthorized or deviceId missing' });
      return;
    }

    // Emit live logout command via socket
    try {
      const io = getIO();
      io.to(`faculty_${userId}`).emit('force_logout', { deviceId });
      console.log(`Live logout command sent to device ${deviceId} for faculty ${userId}`);
    } catch (socketErr) {
      console.warn('Socket emission failed for live logout:', socketErr);
    }

    // Audit Log
    createAuditLog({
      action: 'Force Logout',
      details: `Sent remote logout signal to device ${deviceId}`,
      req
    });

    res.json({ message: 'Live logout initiated' });
  } catch (error) {
    console.error('Logout device error:', error);
    res.status(500).json({ message: 'Failed to initiate live logout' });
  }
}
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const faculty = await Faculty.findById(userId).select('name email username isFirstLogin twoFactorEnabled');
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user: { id: faculty.id, name: faculty.name, username: faculty.username, email: faculty.email, isFirstLogin: faculty.isFirstLogin, twoFactorEnabled: faculty.twoFactorEnabled } });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { name, email, username } = req.body as { name?: string; email?: string; username?: string };
    if (!name || !email || !username) {
      res.status(400).json({ message: 'name, email, and username are required' });
      return;
    }

    // Ensure uniqueness excluding current user
    const emailClash = await Faculty.findOne({ email, _id: { $ne: userId } });
    if (emailClash) {
      res.status(409).json({ message: 'Email already in use' });
      return;
    }

    const usernameClash = await Faculty.findOne({ username, _id: { $ne: userId } });
    if (usernameClash) {
      res.status(409).json({ message: 'Username already taken' });
      return;
    }

    const faculty = await Faculty.findById(userId);
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const newEmail = email.trim().toLowerCase();
    const currentEmail = faculty.email;
    let emailVerificationRequired = false;

    // Update name and username immediately
    faculty.name = name.trim();
    faculty.username = username.trim().toLowerCase();

    // Check if email has changed
    if (newEmail !== currentEmail) {
      const emailClash = await Faculty.findOne({ email: newEmail, _id: { $ne: userId } });
      if (emailClash) {
        res.status(409).json({ message: 'Email already in use' });
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      faculty.tempEmail = newEmail;
      faculty.otp = otp;
      faculty.otpExpires = otpExpires;

      await sendOTPEmail(newEmail, otp);
      emailVerificationRequired = true;
    }

    await faculty.save();

    res.json({
      user: {
        id: faculty.id,
        name: faculty.name,
        username: faculty.username,
        email: faculty.email // Return OLD email until verified
      },
      emailVerificationRequired,
      tempEmail: emailVerificationRequired ? newEmail : undefined,
      message: emailVerificationRequired ? 'Profile updated. Please verify your new email.' : 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { oldPassword, newPassword, confirmPassword } = req.body as { oldPassword?: string; newPassword?: string; confirmPassword?: string };
    if (!oldPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ message: 'oldPassword, newPassword and confirmPassword are required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ message: 'New password and confirm password do not match' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    const faculty = await Faculty.findById(userId);
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await faculty.comparePassword(oldPassword);
    if (!isMatch) {
      res.status(401).json({ message: 'Old password is incorrect' });
      return;
    }

    faculty.password = newPassword;
    await faculty.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
}

export async function getFacultySubjects(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const faculty = await Faculty.findById(userId).select('timetable');
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    // Extract unique subjects from timetable
    const subjects = new Set<string>();
    const subjectSections: { [key: string]: Set<string> } = {};
    const subjectSessionTypes: { [key: string]: Set<string> } = {};

    if (faculty.timetable && faculty.timetable.length > 0) {
      faculty.timetable.forEach(day => {
        if (day.sessions) {
          day.sessions.forEach(session => {
            subjects.add(session.subject);

            if (!subjectSections[session.subject]) {
              subjectSections[session.subject] = new Set<string>();
            }
            subjectSections[session.subject].add(session.section);

            if (!subjectSessionTypes[session.subject]) {
              subjectSessionTypes[session.subject] = new Set<string>();
            }
            subjectSessionTypes[session.subject].add(session.sessionType);
          });
        }
      });
    }

    // Convert to arrays
    const subjectsArray = Array.from(subjects).sort();
    const subjectSectionsArray: { [key: string]: string[] } = {};
    const subjectSessionTypesArray: { [key: string]: string[] } = {};

    Object.keys(subjectSections).forEach(subject => {
      subjectSectionsArray[subject] = Array.from(subjectSections[subject]).sort();
    });

    Object.keys(subjectSessionTypes).forEach(subject => {
      subjectSessionTypesArray[subject] = Array.from(subjectSessionTypes[subject]).sort();
    });

    res.json({
      subjects: subjectsArray,
      subjectSections: subjectSectionsArray,
      subjectSessionTypes: subjectSessionTypesArray
    });
  } catch (error) {
    console.error('Get faculty subjects error:', error);
    res.status(500).json({ message: 'Failed to fetch faculty subjects' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      // For security reasons, don't reveal if user exists
      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    faculty.resetPasswordToken = token;
    faculty.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await faculty.save();

    await sendPasswordResetEmail(email, token);

    // Audit Log
    createAuditLog({
      action: 'Recovery Requested',
      details: `Password reset link sent to ${email}`,
      req,
      facultyId: faculty.id
    });

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ message: 'Token and password are required' });
      return;
    }

    const faculty = await Faculty.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!faculty) {
      res.status(400).json({ message: 'Password reset token is invalid or has expired' });
      return;
    }

    faculty.password = password;
    faculty.resetPasswordToken = undefined;
    faculty.resetPasswordExpires = undefined;

    await faculty.save();

    // Send confirmation email
    await sendPasswordResetSuccessEmail(faculty.email);

    // Audit Log
    createAuditLog({
      action: 'Password Reset',
      details: 'Password was successfully reset using a recovery link',
      req,
      facultyId: faculty.id
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
}

export async function verifyOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP are required' });
      return;
    }

    const faculty = await Faculty.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!faculty) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    faculty.isVerified = true;
    faculty.otp = undefined;
    faculty.otpExpires = undefined;
    await faculty.save();

    const token = signToken(faculty.id);
    const isFirstLogin = faculty.isFirstLogin;

    if (isFirstLogin) {
      faculty.isFirstLogin = false;
      await faculty.save();
      // Send Welcome Email
      sendWelcomeEmail(faculty.email, faculty.name).catch(err =>
        console.error('Failed to send welcome email:', err)
      );
    }

    // Audit Log
    createAuditLog({
      action: 'Account Verified',
      details: `Email ${email} verified successfully via OTP`,
      req,
      facultyId: faculty.id
    });

    res.json({
      message: 'Account verified successfully',
      token,
      isFirstLogin,
      user: { id: faculty.id, name: faculty.name, username: faculty.username, email: faculty.email }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
}

export async function resendOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (faculty.isVerified) {
      res.status(400).json({ message: 'Account is already verified' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    faculty.otp = otp;
    faculty.otpExpires = otpExpires;
    await faculty.save();

    await sendOTPEmail(email, otp);

    res.json({ message: 'New OTP sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
}

export async function verify2FA(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: 'Email and code are required' });
      return;
    }

    const faculty = await Faculty.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!faculty) {
      res.status(400).json({ message: 'Invalid or expired security code' });
      return;
    }

    // Clear OTP
    faculty.otp = undefined;
    faculty.otpExpires = undefined;
    await faculty.save();

    const token = signToken(faculty.id);

    // Audit Log
    createAuditLog({
      action: '2FA Verified',
      details: `Successful 2FA verification for ${email}`,
      req,
      facultyId: faculty.id
    });

    res.json({
      token,
      user: { id: faculty.id, name: faculty.name, username: faculty.username, email: faculty.email }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ message: '2FA verification failed' });
  }
}

export async function toggle2FA(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { enabled } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const faculty = await Faculty.findById(userId);
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    faculty.twoFactorEnabled = !!enabled;
    await faculty.save();

    // Audit Log
    createAuditLog({
      action: '2FA Setting Changed',
      details: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
      req,
      facultyId: faculty.id
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    faculty.otp = otp;
    faculty.otpExpires = otpExpires;
    await faculty.save();

    await sendOTPEmail(faculty.email, otp);

    res.json({
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      twoFactorEnabled: faculty.twoFactorEnabled
    });
  } catch (error) {
    console.error('Toggle 2FA error:', error);
    res.status(500).json({ message: 'Failed to update 2FA setting' });
  }
}

export async function resend2FA(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!faculty.twoFactorEnabled) {
      res.status(400).json({ message: '2FA is not enabled for this account' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    faculty.otp = otp;
    faculty.otpExpires = otpExpires;
    await faculty.save();

    await send2FAEmail(email, otp);

    res.json({ message: 'New security code sent to your email' });
  } catch (error) {
    console.error('Resend 2FA error:', error);
    res.status(500).json({ message: 'Failed to resend security code' });
  }
}

export async function verifyEmailChangeOTP(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { otp } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!otp) {
      res.status(400).json({ message: 'OTP is required' });
      return;
    }

    const faculty = await Faculty.findById(userId);
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!faculty.tempEmail || !faculty.otp || !faculty.otpExpires) {
      res.status(400).json({ message: 'No pending email verification found' });
      return;
    }

    if (faculty.otp !== otp) {
      res.status(400).json({ message: 'Invalid OTP' });
      return;
    }

    if (faculty.otpExpires < new Date()) {
      res.status(400).json({ message: 'OTP has expired' });
      return;
    }

    // Verify successful
    const newEmail = faculty.tempEmail;

    // Double check uniqueness one last time
    const emailClash = await Faculty.findOne({ email: newEmail, _id: { $ne: userId } });
    if (emailClash) {
      res.status(409).json({ message: 'Email already in use by another account' });
      return;
    }

    faculty.email = newEmail;
    faculty.otp = undefined;
    faculty.otpExpires = undefined;
    faculty.tempEmail = undefined;

    await faculty.save();

    // Audit Log
    createAuditLog({
      action: 'Email Changed',
      details: `Email address updated to ${newEmail}`,
      req,
      facultyId: faculty.id
    });

    res.json({
      message: 'Email updated successfully',
      user: {
        id: faculty.id,
        name: faculty.name,
        username: faculty.username,
        email: faculty.email
      }
    });

  } catch (error) {
    console.error('Verify email change OTP error:', error);
    res.status(500).json({ message: 'Failed to verify email change' });
  }
}
