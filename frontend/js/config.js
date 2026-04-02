// Dynamically determine API URL so the app works both as a local file and when hosted/tunneled
const API_URL = window.location.protocol === 'file:'
    ? 'http://localhost:5000/api'
    : '/api';

const SOCKET_URL = window.location.protocol === 'file:'
    ? 'http://localhost:5000'
    : window.location.origin;

const getHeaders = () => {
    const token = localStorage.getItem('token');
    const subdomain = localStorage.getItem('subdomain');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Inject local testing tenant override if it exists
    if (subdomain) {
        headers['x-tenant-subdomain'] = subdomain;
    }

    return headers;
};
