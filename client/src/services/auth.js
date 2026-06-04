import { api } from './api';

export async function login(email, password) {
  const data = await api.login(email, password);
  // Si la API devuelve usuario, devolverlo; si no, obtenerlo con /auth/me
  if (data.usuario) {
    return data.usuario;
  }
  // Si no hay usuario en la respuesta, obtenerlo del endpoint /auth/me
  const userData = await api.me();
  return userData.usuario || userData;
}

export async function register(nombre, email, password) {
  const data = await api.register(nombre, email, password);
  console.log('auth.register - data received:', data);
  // El registro devuelve usuario con token guardado
  if (data.usuario) {
    console.log('auth.register - returning user:', data.usuario);
    return data.usuario;
  }
  // Fallback: si no hay usuario, obtenerlo
  console.log('auth.register - no usuario in response, calling api.me()');
  const userData = await api.me();
  console.log('auth.register - userData from me():', userData);
  return userData.usuario || userData;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/login';
}

export function getUsuarioActual() {
  const usuario = localStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
}

export function estaAutenticado() {
  return !!localStorage.getItem('token');
}