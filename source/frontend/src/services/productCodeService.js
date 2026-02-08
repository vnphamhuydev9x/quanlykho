import axiosInstance from '../utils/axios';

const productCodeService = {
    getAll: async (page = 1, limit = 20, search = '', status = '') => {
        const params = { page, limit, search };
        if (status) {
            params.status = status;
        }
        const response = await axiosInstance.get('/product-codes', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await axiosInstance.get(`/product-codes/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await axiosInstance.post('/product-codes', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await axiosInstance.put(`/product-codes/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await axiosInstance.delete(`/product-codes/${id}`);
        return response.data;
    },

    uploadImages: async (id, files, field = 'images') => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });
        const response = await axiosInstance.post(`/product-codes/${id}/upload`, formData, {
            params: { field },
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    exportData: async () => {
        const response = await axiosInstance.get('/product-codes/export/all');
        return response.data;
    }
};

export default productCodeService;
