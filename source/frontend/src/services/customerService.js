import axios from 'axios';

const API_URL = 'http://localhost:3000/api/customers';

const customerService = {
    getAll: async (params) => {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` },
            params
        });
        return response.data;
    },

    create: async (data) => {
        const token = localStorage.getItem('access_token');
        const response = await axios.post(API_URL, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    update: async (id, data) => {
        const token = localStorage.getItem('access_token');
        const response = await axios.put(`${API_URL}/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    delete: async (id) => {
        const token = localStorage.getItem('access_token');
        const response = await axios.delete(`${API_URL}/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    getAllCustomersForExport: async () => {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${API_URL}/export-data`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};

export default customerService;
