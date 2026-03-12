import axiosInstance from '../utils/axios';

const debtService = {
    getYears: async () => {
        const response = await axiosInstance.get('/debts/years');
        return response.data;
    },
    getSummary: async (year) => {
        const response = await axiosInstance.get('/debts', { params: { year } });
        return response.data;
    },
    getCustomerDetail: async (customerId, year) => {
        const response = await axiosInstance.get(`/debts/${customerId}`, { params: { year } });
        return response.data;
    },
    upsertOpeningBalance: async (customerId, data) => {
        const response = await axiosInstance.put(`/debts/${customerId}/opening-balance`, data);
        return response.data;
    },
};

export default debtService;
