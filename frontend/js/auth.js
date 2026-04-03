const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerVerifyForm = document.getElementById('registerVerifyForm');
const loginOtpRequestForm = document.getElementById('loginOtpRequestForm');
const loginOtpVerifyForm = document.getElementById('loginOtpVerifyForm');
const forgotPasswordRequestForm = document.getElementById('forgotPasswordRequestForm');
const forgotPasswordVerifyForm = document.getElementById('forgotPasswordVerifyForm');

const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const showOtpLoginBtn = document.getElementById('showOtpLogin');
const showLoginFromOtpReq = document.getElementById('showLoginFromOtpReq');
const showForgotPasswordBtn = document.getElementById('showForgotPassword');
const showLoginFromForgotBtn = document.getElementById('showLoginFromForgot');

let tempEmail = '';
let tempSubdomain = '';

// Helper to Hide All Forms
const hideAllForms = () => {
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    registerVerifyForm.classList.add('hidden');
    loginOtpRequestForm.classList.add('hidden');
    loginOtpVerifyForm.classList.add('hidden');
    forgotPasswordRequestForm.classList.add('hidden');
    forgotPasswordVerifyForm.classList.add('hidden');
};

showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllForms();
    registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllForms();
    loginForm.classList.remove('hidden');
});

showOtpLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllForms();
    loginOtpRequestForm.classList.remove('hidden');
});

if (showLoginFromOtpReq) {
    showLoginFromOtpReq.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllForms();
        loginForm.classList.remove('hidden');
    });
}

if (showForgotPasswordBtn) {
    showForgotPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllForms();
        forgotPasswordRequestForm.classList.remove('hidden');
    });
}

if (showLoginFromForgotBtn) {
    showLoginFromForgotBtn.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllForms();
        loginForm.classList.remove('hidden');
    });
}

// Helper for Session Storage
const handleSessionSuccess = (data, subdomain) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('name', data.name);
    localStorage.setItem('userId', data._id);
    localStorage.setItem('subdomain', subdomain || 'default');
    if (data.role === 'Librarian') window.location.href = 'dashboard-librarian.html';
    else window.location.href = 'dashboard-member.html';
};

// 1. Registration Request
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const subdomain = document.getElementById('regSubdomain').value.trim();

    const headers = { 'Content-Type': 'application/json' };
    if (subdomain) headers['x-tenant-subdomain'] = subdomain;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.message);

        tempEmail = email;
        tempSubdomain = subdomain;
        hideAllForms();
        registerVerifyForm.classList.remove('hidden');
        alert('Check your inbox! We sent you a 6-digit confirmation pin.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// 2. Registration Verification
registerVerifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('regVerifyOtp').value.trim();
    const headers = { 'Content-Type': 'application/json' };
    if (tempSubdomain) headers['x-tenant-subdomain'] = tempSubdomain;

    try {
        const res = await fetch(`${API_URL}/auth/register-verify`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ email: tempEmail, otp })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.message);
        handleSessionSuccess(data, tempSubdomain);
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// 3. Password Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const subdomain = document.getElementById('loginSubdomain').value.trim();

    const headers = { 'Content-Type': 'application/json' };
    if (subdomain) headers['x-tenant-subdomain'] = subdomain;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.message);
        handleSessionSuccess(data, subdomain);
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// 4. Passwordless Login OTP Request
loginOtpRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('otpRequestEmail').value;
    const subdomain = document.getElementById('otpSubdomain').value.trim();

    const headers = { 'Content-Type': 'application/json' };
    if (subdomain) headers['x-tenant-subdomain'] = subdomain;

    try {
        const res = await fetch(`${API_URL}/auth/login-otp-request`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.message);

        tempEmail = email;
        tempSubdomain = subdomain;
        hideAllForms();
        loginOtpVerifyForm.classList.remove('hidden');
        alert('A precise 6-digit login code has been sent directly to your email inbox.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// 5. Passwordless Login OTP Verify
loginOtpVerifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('loginVerifyOtp').value.trim();
    const headers = { 'Content-Type': 'application/json' };
    if (tempSubdomain) headers['x-tenant-subdomain'] = tempSubdomain;

    try {
        const res = await fetch(`${API_URL}/auth/login-otp-verify`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ email: tempEmail, otp })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.message);
        handleSessionSuccess(data, tempSubdomain);
    } catch (err) {
        alert('Error: ' + err.message);
    }
});
