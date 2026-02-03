import axios from 'axios';

const API_URL = 'http://localhost:3000/api/employees';

const employeeService = {
    getAll: async (params) => {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` },
            params
        });
        return response.data;
    },
    // Add other methods if needed later
};

export default employeeService;
