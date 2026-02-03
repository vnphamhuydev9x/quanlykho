import axiosInstance from '../utils/axios';

const customerService = {
    getAll: async (params) => {
        const response = await axiosInstance.get('/customers', { params });
        return response.data;
    },

    create: async (data) => {
        const response = await axiosInstance.post('/customers', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await axiosInstance.put(`/customers/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await axiosInstance.delete(`/customers/${id}`);
        return response.data;
    },

    getAllCustomersForExport: async () => {
        const response = await axiosInstance.get('/customers/export-data');
        return response.data;
    }
};

export default customerService;
