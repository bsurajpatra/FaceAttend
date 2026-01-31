import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Faculty } from '../models/Faculty';
import { env } from '../config/env';
import { getIO } from '../socket';

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

    const faculty = await Faculty.create({ name, email, username, password });
    const token = signToken(faculty.id);
    res.status(201).json({
      user: { id: faculty.id, name: faculty.name, username: faculty.username },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
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
    res.json({
      user: {
        id: faculty.id,
        name: faculty.name,
        username: faculty.username,
        email: faculty.email
      },
      token,
      isTrusted: currentDeviceTrusted
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

    res.json({ message: 'Device revoked successfully', devices: faculty.devices });
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
      console.warn('Socket emission failed for trust device:', socketErr);
    }

    res.json({ message: 'Device trusted successfully', devices: faculty.devices });
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

    const faculty = await Faculty.findById(userId).select('name email username');
    if (!faculty) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user: { id: faculty.id, name: faculty.name, username: faculty.username, email: faculty.email } });
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

    faculty.name = name.trim();
    faculty.email = email.trim().toLowerCase();
    faculty.username = username.trim().toLowerCase();
    await faculty.save();

    res.json({ user: { id: faculty.id, name: faculty.name, username: faculty.username, email: faculty.email } });
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
