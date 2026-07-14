// Global API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

async function apiCall(endpoint, method = 'GET', body = null) {
    const url = 'http://localhost:5000/api' + endpoint;
    const options = {
        method,
        headers: {}
    };

    // Attach JWT if exists
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.token) {
        options.headers['Authorization'] = `Bearer ${user.token}`;
    }

    if (body) {
        if (body instanceof FormData) {
            options.body = body; // Unset default JSON so browser generates boundaries automatically
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            let message = 'API call failed';
            try {
                const err = await response.json();
                message = err.message || message;
            } catch (e) {
                message = `Error ${response.status}: ${response.statusText || 'Unknown error'}`;
            }
            throw new Error(message);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
