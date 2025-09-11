import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, username, password } = req.body as { name: string; username: string; password: string };
    if (!name || !username || !password) {
      res.status(400).json({ message: 'name, username, password are required' });
      return;
    }

    const existing = await User.findOne({ username });
    if (existing) {
      res.status(409).json({ message: 'Username already taken' });
      return;
    }

    const user = await User.create({ name, username, password });
    const token = signToken(user.id);
    res.status(201).json({
      user: { id: user.id, name: user.name, username: user.username },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      res.status(400).json({ message: 'username and password are required' });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = signToken(user.id);
    res.json({ user: { id: user.id, name: user.name, username: user.username }, token });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
}


