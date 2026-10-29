import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5085';

const api = axios.create({
  baseURL: `${API_URL}/api`
});

let token = null;
let alExpirarSesion = null;

export function configurarSesion(nuevoToken, onExpira = null) {
  token = nuevoToken;
  alExpirarSesion = onExpira;
}

api.interceptors.request.use(config => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && token && alExpirarSesion) alExpirarSesion();
    return Promise.reject(err);
  }
);

export default api;
