import axios from 'axios';

export const API_URL: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, '');

// Origen del backend SIN el sufijo "/api" (para armar la URL de las fotos: /uploads/...).
// Solo se quita "/api" al FINAL; un .replace('/api','') a secas rompe dominios como api.midominio.com.
export const API_BASE: string = API_URL.replace(/\/api$/, '');

/** Las fotos nuevas viven en Cloudinary (URL https completa); las antiguas, en el servidor (ruta /uploads/...). */
export const urlFoto = (url: string) => (/^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`);

export const api = axios.create({ baseURL: API_URL, timeout: 30_000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function cerrarSesion() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (window.location.pathname !== '/login') window.location.href = '/login';
}

// Si el access token expiró (401), intenta refrescarlo una vez y reintenta
// la petición original. Si el refresh también falla, manda a login.
let refrescando: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Las rutas /auth/* (login, refresh) devuelven 401 por credenciales incorrectas:
    // no se intenta refrescar ni se recarga la página, para poder mostrar el error.
    const esAuth = typeof original?.url === 'string' && original.url.includes('/auth/');
    if (error.response?.status !== 401 || !original || original._retry || esAuth) {
      return Promise.reject(error);
    }
    original._retry = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      cerrarSesion();
      return Promise.reject(error);
    }

    try {
      if (!refrescando) {
        refrescando = axios
          .post(`${API_URL}/auth/refresh`, { refreshToken })
          .then((res) => {
            localStorage.setItem('accessToken', res.data.accessToken);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            return res.data.accessToken as string;
          })
          .finally(() => {
            refrescando = null;
          });
      }
      const nuevoToken = await refrescando;
      original.headers.Authorization = `Bearer ${nuevoToken}`;
      return api(original);
    } catch {
      cerrarSesion();
      return Promise.reject(error);
    }
  },
);
