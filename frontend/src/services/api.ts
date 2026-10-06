import axios from 'axios';

const PRIMARY_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
const FALLBACK_URL = PRIMARY_URL.includes('localhost')
  ? 'http://192.168.1.2:4000/api/v1'
  : 'http://localhost:4000/api/v1';

let currentBaseUrl = PRIMARY_URL;

export const api = axios.create({
  baseURL: currentBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle Token Refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Automatically unwrap TransformInterceptor wrapper { success: true, data: T, timestamp }
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Network error fallback retry (e.g. switch between localhost ADB and Wi-Fi IP)
    if (!error.response && originalRequest && !originalRequest._retriedWithFallback) {
      originalRequest._retriedWithFallback = true;
      currentBaseUrl = currentBaseUrl === PRIMARY_URL ? FALLBACK_URL : PRIMARY_URL;
      api.defaults.baseURL = currentBaseUrl;
      originalRequest.baseURL = currentBaseUrl;
      return api(originalRequest);
    }

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken || refreshToken === 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${currentBaseUrl}/auth/refresh`, {
          refreshToken,
        });

        const tokenData = response.data?.data?.tokens || response.data?.tokens;
        const accessToken = tokenData?.accessToken;
        const newRefresh = tokenData?.refreshToken;

        if (!accessToken) {
          throw new Error('Tokens not received in refresh response');
        }

        localStorage.setItem('access_token', accessToken);
        if (newRefresh) {
          localStorage.setItem('refresh_token', newRefresh);
        }

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
