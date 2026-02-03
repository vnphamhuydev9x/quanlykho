import axios from 'axios';

// Create axios instance
const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000/api',
});

// Request interceptor: Add token to headers
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: Handle 401/403 (Unauthorized/Forbidden)
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Check for 401 or 403 with token error code
        if (error.response) {
            const status = error.response.status;
            const errorCode = error.response.data?.code;

            // Token invalid or expired (401 or 403 with code 99004)
            if (status === 401 || (status === 403 && errorCode === 99004)) {
                // Clear auth data
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_info');

                // Redirect to login
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
