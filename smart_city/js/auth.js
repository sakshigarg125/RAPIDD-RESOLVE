// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.role) {
        if (user.role === 'admin') window.location.href = 'admin.html';
        else if (user.role === 'officer') window.location.href = 'officier.html';
        else if (user.role === 'citizen') window.location.href = 'citizen.html';
    }
});

// 1. Modal Logic
function openRegisterModal() {
    document.getElementById('registerModal').classList.remove('hidden');
    document.getElementById('successToast').classList.add('hidden'); // hide previous success toasts
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.add('hidden');
}

// 2. Handle Registration Logic
async function executeRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('regBtn');

    // Get form data
    const frstName = document.querySelectorAll('#registerForm input[type="text"]')[0].value;
    const lstName = document.querySelectorAll('#registerForm input[type="text"]')[1].value;
    const email = document.querySelector('#registerForm input[type="email"]').value;
    const pwd = document.querySelector('#registerForm input[type="password"]').value;
    const role = document.getElementById('regRole') ? document.getElementById('regRole').value : 'citizen';

    btn.innerHTML = 'Executing...';
    btn.style.opacity = '0.8';

    try {
        await apiCall('/auth/register', 'POST', {
            firstName: frstName,
            lastName: lstName,
            email: email,
            password: pwd,
            role: role
        });

        document.getElementById('registerForm').reset();
        closeRegisterModal();
        document.getElementById('successToast').classList.remove('hidden');

        // Automatically set role selector to whatever role they just registered
        document.getElementById('loginRole').value = role;
    } catch (err) {
        alert("Registration Failed: " + err.message);
    } finally {
        btn.innerHTML = 'Register Account';
        btn.style.opacity = '1';
    }
}

// 3. Handle Dashboard Routing logic properly based on Login form role selector!
async function executeLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const role = document.getElementById('loginRole').value;
    const idField = document.querySelectorAll('#loginForm input[type="email"]')[0].value;
    const password = document.querySelectorAll('#loginForm input[type="password"]')[0].value;

    btn.innerHTML = 'Authenticating...';
    btn.style.opacity = '0.8';

    try {
        const response = await apiCall('/auth/login', 'POST', {
            email: idField,
            password: password,
            role: role
        });

        // Save user session
        localStorage.setItem('currentUser', JSON.stringify({
            id: response._id,
            userId: response.userId,
            role: response.role,
            name: response.name,
            email: response.email,
            joined: response.joined,
            status: response.status,
            token: response.token
        }));

        // Route navigation accurately
        if (role === 'admin') {
            window.location.href = 'admin.html';
        } else if (role === 'officer') {
            window.location.href = 'officier.html';
        } else if (role === 'citizen') {
            window.location.href = 'citizen.html';
        }
    } catch (err) {
        alert("Login Failed: " + err.message);
    } finally {
        btn.innerHTML = 'Secure Login';
        btn.style.opacity = '1';
    }
}
