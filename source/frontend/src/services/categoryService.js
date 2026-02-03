import axiosInstance from '../utils/axios';

const categoryService = {
    getAll: async (params) => {
        const response = await axiosInstance.get('/categories', { params });
        return response.data;
    },

    create: async (data) => {
        const response = await axiosInstance.post('/categories', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await axiosInstance.put(`/categories/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await axiosInstance.delete(`/categories/${id}`);
        return response.data;
    }
};

export default categoryService;
