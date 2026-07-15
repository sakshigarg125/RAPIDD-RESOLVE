const API_BASE_URL = 'https://rapidresolve-backend.onrender.com/api';

async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {}
    };

    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.token) {
        options.headers['Authorization'] = `Bearer ${user.token}`;
    }

    if (body) {
        if (body instanceof FormData) {
            options.body = body;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "API Error");
    }

    return await response.json();
}