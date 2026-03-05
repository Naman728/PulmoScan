import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email); // FastAPI OAuth2 expects 'username'
        formData.append('password', password);

        const response = await api.post('/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/users/', userData);
        return response.data;
    },

    getMe: async () => {
        const response = await api.get('/users/me');
        return response.data;
    },
};

export const patientService = {
    getAll: async () => {
        const response = await api.get('/patients/');
        return response.data;
    },

    getOne: async (id) => {
        const response = await api.get(`/patients/${id}`);
        return response.data;
    },

    create: async (patientData) => {
        const response = await api.post('/patients/', patientData);
        return response.data;
    },

    update: async (id, patientData) => {
        const response = await api.put(`/patients/${id}`, patientData);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/patients/${id}`);
        return response.data;
    },
};

export const scanService = {
    createCTScan: async (scanData) => {
        // Current backend schema expects a file_path string, not an actual file upload
        // I'll simulate a mock file upload by getting a fake path if no real upload exists.
        const response = await api.post('/ct-scans/', scanData);
        return response.data;
    },

    createXRay: async (scanData) => {
        const response = await api.post('/xrays/', scanData);
        return response.data;
    },

    getPatientCTScans: async (patientId) => {
        const response = await api.get(`/ct-scans/patient/${patientId}`);
        return response.data;
    },

    getPatientXRays: async (patientId) => {
        const response = await api.get(`/xrays/patient/${patientId}`);
        return response.data;
    },

    getAllCTScans: async () => {
        const response = await api.get('/ct-scans/');
        return response.data;
    },

    getAllXRays: async () => {
        const response = await api.get('/xrays/');
        return response.data;
    },
};

export const aiPredictionService = {
    /**
     * CT scan: pass a single File or an array of Files (multiple slices).
     * Returns { slice_results, final_diagnosis, final_confidence, total_slices }.
     */
    predictCTScan: async (files) => {
        const formData = new FormData();
        const fileList = Array.isArray(files) ? files : [files];
        fileList.forEach((file) => formData.append('files', file));
        const response = await api.post('/ai/predict/ctscan', formData);
        return response.data;
    },

    predictXRay: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/ai/predict/xray', formData);
        return response.data;
    },
};

export const predictionService = {
    create: async (predictionData) => {
        const response = await api.post('/predictions/', predictionData);
        return response.data;
    },

    getPatientPredictions: async (patientId) => {
        const response = await api.get(`/predictions/patient/${patientId}`);
        return response.data;
    },

    getOne: async (id) => {
        const response = await api.get(`/predictions/${id}`);
        return response.data;
    },

    getAll: async () => {
        const response = await api.get('/predictions/');
        return response.data;
    },
};

export default api;
