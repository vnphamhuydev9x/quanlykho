import axiosInstance from '../utils/axios';

const manifestService = {
    getAll: async (params) => {
        const response = await axiosInstance.get('/manifests', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await axiosInstance.get(`/manifests/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await axiosInstance.post('/manifests', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await axiosInstance.put(`/manifests/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await axiosInstance.delete(`/manifests/${id}`);
        return response.data;
    },

    addItems: async (id, productCodeIds) => {
        const response = await axiosInstance.post(`/manifests/${id}/add-items`, { productCodeIds });
        return response.data;
    },

    removeItems: async (id, productCodeIds) => {
        const response = await axiosInstance.post(`/manifests/${id}/remove-items`, { productCodeIds });
        return response.data;
    }
};

export default manifestService;
