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

    // productCodeIds tùy chọn khi tạo mới
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
    },

    // v3 — Override vehicleStatus thủ công cho 1 mã hàng
    updateVehicleStatus: async (manifestId, pcId, vehicleStatus) => {
        const response = await axiosInstance.patch(
            `/manifests/${manifestId}/product-codes/${pcId}/vehicle-status`,
            { vehicleStatus }
        );
        return response.data;
    },

    // v3 — Khôi phục vehicleStatus về trạng thái xe
    resetVehicleStatus: async (manifestId, pcId) => {
        const response = await axiosInstance.patch(
            `/manifests/${manifestId}/product-codes/${pcId}/reset-vehicle-status`
        );
        return response.data;
    },

    // v3 — Bulk override vehicleStatus cho nhiều mã hàng
    bulkUpdateVehicleStatus: async (manifestId, productCodeIds, vehicleStatus) => {
        const response = await axiosInstance.patch(
            `/manifests/${manifestId}/product-codes/bulk-vehicle-status`,
            { productCodeIds, vehicleStatus }
        );
        return response.data;
    }
};

export default manifestService;
