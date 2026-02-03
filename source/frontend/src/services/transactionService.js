import axios from 'axios';

const API_URL = 'http://localhost:3000/api/transactions';

const transactionService = {
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

    cancel: async (id) => {
        const token = localStorage.getItem('access_token');
        const response = await axios.post(`${API_URL}/${id}/cancel`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};

export default transactionService;
