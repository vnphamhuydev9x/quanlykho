import axiosInstance from '../utils/axios';

const declarationService = {
    getAll: async (params) => {
        const response = await axiosInstance.get('/declarations', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await axiosInstance.get(`/declarations/${id}`);
        return response.data;
    },

    create: async (data) => {
        const isFormData = data instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        const response = await axiosInstance.post('/declarations', data, config);
        return response.data;
    },

    update: async (id, data) => {
        const isFormData = data instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        const response = await axiosInstance.put(`/declarations/${id}`, data, config);
        return response.data;
    },

    delete: async (id) => {
        const response = await axiosInstance.delete(`/declarations/${id}`);
        return response.data;
    },



    export: async () => {
        const response = await axiosInstance.get('/declarations/export/all');
        return response.data;
    }
};

export default declarationService;
