import axiosInstance from '../utils/axios';

const merchandiseConditionService = {
    getAll: async (params) => {
        const response = await axiosInstance.get('/merchandise-conditions', { params });
        return response.data;
    },
    create: async (data) => {
        const response = await axiosInstance.post('/merchandise-conditions', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await axiosInstance.put(`/merchandise-conditions/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await axiosInstance.delete(`/merchandise-conditions/${id}`);
        return response.data;
    }
};

export default merchandiseConditionService;
