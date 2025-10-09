import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Faculty } from '../models/Faculty';
import { env } from '../config/env';

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
    const { username, password } = req.body as { username: string; password: string };
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

    const token = signToken(faculty.id);
    res.json({ user: { id: faculty.id, name: faculty.name, username: faculty.username }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
}


