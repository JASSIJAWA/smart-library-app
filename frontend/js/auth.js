const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');

// Toggle Forms
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const subdomain = document.getElementById('regSubdomain').value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!emailRegex.test(email)) {
        if(typeof showCustomAlert === 'function') {
            await showCustomAlert('Invalid Email', 'Please provide a valid email address with a domain (e.g. user@example.com)', false);
        } else {
            alert('Please provide a valid email address with a domain (e.g. user@example.com)');
        }
        return;
    }

    if (!passwordRegex.test(password)) {
        if(typeof showCustomAlert === 'function') {
            await showCustomAlert('Weak Password', 'Password must be at least 8 chars long, contain 1 number, 1 uppercase letter, and 1 special character (@$!%*?&).', false);
        } else {
            alert('Password must be at least 8 chars long, contain 1 number, 1 uppercase letter, and 1 special character (@$!%*?&).');
        }
        return;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (subdomain) {
        headers['x-tenant-subdomain'] = subdomain;
    }

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ name, email, password, role })
        });
        if (!res.ok) {
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                alert(data.message);
            } catch (e) {
                console.error('Server Error:', text);
                alert('Server Error (Check Console): ' + text.substring(0, 100));
            }
            return;
        }

        // Save tenant subdomain
        localStorage.setItem('subdomain', subdomain || 'default');

        alert('Registration successful! Please login.');
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');    } catch (err) {
        console.error(err);
        alert('Network/Code Error: ' + (err.message || 'Unknown error'));
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const subdomain = document.getElementById('loginSubdomain').value.trim();

    const headers = { 'Content-Type': 'application/json' };
    if (subdomain) {
        headers['x-tenant-subdomain'] = subdomain;
    }

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                alert(data.message);
            } catch (e) {
                console.error('Server Error:', text);
                alert('Server Error (Check Console): ' + text.substring(0, 100));
            }
            return;
        }

        const data = await res.json();

        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('name', data.name);
        localStorage.setItem('userId', data._id);

        // Save tenant subdomain for subsequent API calls in local testing
        localStorage.setItem('subdomain', subdomain || 'default');

        if (data.role === 'Librarian') {
            window.location.href = 'dashboard-librarian.html';
        } else {
            window.location.href = 'dashboard-member.html';
        }

    } catch (err) {
        console.error(err);
        alert('Network/Code Error: ' + (err.message || 'Unknown error'));
    }
});
