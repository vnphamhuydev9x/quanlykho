import axiosInstance from '../utils/axios';

const exportOrderService = {
    getAll: async (params) => {
        const response = await axiosInstance.get('/export-orders', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await axiosInstance.get(`/export-orders/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await axiosInstance.post('/export-orders', data);
        return response.data;
    },

    // Gửi số cân thực tế - DA_TAO_LENH → DANG_XAC_NHAN_CAN
    submitReweigh: async (id, productItems) => {
        const response = await axiosInstance.patch(`/export-orders/${id}/submit-reweigh`, { productItems });
        return response.data;
    },

    // Xác nhận số cân - DANG_XAC_NHAN_CAN → DA_XAC_NHAN_CAN
    confirmReweigh: async (id, productItems) => {
        const response = await axiosInstance.patch(`/export-orders/${id}/confirm-reweigh`, { productItems });
        return response.data;
    },

    // Cập nhật trạng thái (DA_XAC_NHAN_CAN → DA_XUAT_KHO)
    updateStatus: async (id, data) => {
        const response = await axiosInstance.patch(`/export-orders/${id}/status`, data);
        return response.data;
    },

    // Hủy lệnh (chỉ khi DA_TAO_LENH)
    cancel: async (id) => {
        const response = await axiosInstance.delete(`/export-orders/${id}`);
        return response.data;
    },
};

export default exportOrderService;
