import axios from 'axios';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Production fallback for our hackathon project
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://down-time-two.vercel.app';
  }
  
  return 'http://localhost:3001';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
