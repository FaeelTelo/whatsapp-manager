import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Cria uma instância básica do axios
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Função para verificar a saúde da API
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    console.error('API health check failed:', error);
    throw error;
  }
};

// Configuração básica de interceptors (sem dependência de useAuth)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Exporta a instância configurada
export default api;
