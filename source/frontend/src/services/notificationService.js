/**
 * @module notification
 * @SD_Ref 03_1_notification_SD.md
 * @SD_Version SD-v1.0.1
 */
import axiosInstance from '../utils/axios';

const notificationService = {
    getUnread: async () => {
        const response = await axiosInstance.get('/notifications');
        return response.data;
    },

    // Tất cả noti (đọc + chưa đọc), sorted mới nhất, có pagination
    getList: async (page = 1, limit = 20) => {
        const response = await axiosInstance.get('/notifications/list', { params: { page, limit } });
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await axiosInstance.put('/notifications/read');
        return response.data;
    },

    markOneAsRead: async (id) => {
        const response = await axiosInstance.put(`/notifications/${id}/read`);
        return response.data;
    },
};

export default notificationService;
