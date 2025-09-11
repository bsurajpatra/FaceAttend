import axios from 'axios';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export const http = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});


