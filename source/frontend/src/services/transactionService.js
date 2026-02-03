import axiosInstance from '../utils/axios';

const transactionService = {
    getAll: async (params) => {
        const response = await axiosInstance.get('/transactions', { params });
        return response.data;
    },

    create: async (data) => {
        const response = await axiosInstance.post('/transactions', data);
        return response.data;
    },

    cancel: async (id) => {
        const response = await axiosInstance.post(`/transactions/${id}/cancel`, {});
        return response.data;
    },

    exportData: async () => {
        const response = await axiosInstance.get('/transactions/export-data');
        return response.data;
    }
};

export default transactionService;
