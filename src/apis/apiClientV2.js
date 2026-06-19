/* eslint-disable no-param-reassign */
import axios from 'axios';
import { useAuthStore } from '@/features/auth/shared/store/authStore';

const apiClientV2 = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
});

apiClientV2.interceptors.request.use(
    config => {
        if (config.url === '/api/v0/users/signin') {
            const { token } = config;
            if (token) {
                config.headers.Authorization = `Basic ${config.token}`;
            }
        }
        // else if (config.url === '/api/v0/users/signin-sso') {}
        else {
            const { token } = useAuthStore.getState();
            if (token) {
                config.headers.Authorization = `Basic ${token}`;
            }
        }
        return config;
    },
    error => Promise.reject(error)
);

apiClientV2.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            const { clearAuth } = useAuthStore.getState();
            clearAuth();
            window.location.href = '/auth';
        }
        return Promise.reject(error);
    }
);

export default apiClientV2;