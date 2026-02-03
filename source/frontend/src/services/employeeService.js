import axiosInstance from '../utils/axios';

const employeeService = {
    getAll: async (params) => {
        const response = await axiosInstance.get('/employees', { params });
        return response.data;
    },
    // Add other methods if needed later
};

export default employeeService;
