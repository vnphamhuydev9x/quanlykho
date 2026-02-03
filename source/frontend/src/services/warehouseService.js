import axios from 'axios';

// Get API URL from environment variable or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getHeader = () => {
    const token = localStorage.getItem('access_token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

const warehouseService = {
    getAll: async (params) => {
        const response = await axios.get(`${API_URL}/warehouses`, {
            params,
            ...getHeader()
        });
        return response.data;
    },

    create: async (data) => {
        const response = await axios.post(`${API_URL}/warehouses`, data, getHeader());
        return response.data;
    },

    update: async (id, data) => {
        const response = await axios.put(`${API_URL}/warehouses/${id}`, data, getHeader());
        return response.data;
    },

    delete: async (id) => {
        const response = await axios.delete(`${API_URL}/warehouses/${id}`, getHeader());
        return response.data;
    }
};

export default warehouseService;
