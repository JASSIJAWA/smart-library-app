// Super Admin Frontend Controller

const getSuperAdminHeaders = () => {
    const token = localStorage.getItem('superAdminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // Login Page Logic
    if (path.includes('login-superadmin.html')) {
        const token = localStorage.getItem('superAdminToken');
        if (token) {
            window.location.href = 'dashboard-superadmin.html';
        }

        const loginForm = document.getElementById('superAdminLoginForm');
        const otpForm = document.getElementById('superAdminOtpForm');
        const forgotRequestForm = document.getElementById('adminForgotPasswordRequestForm');
        const forgotVerifyForm = document.getElementById('adminForgotPasswordVerifyForm');
        let tempMasterEmail = '';

        function hideAllForms() {
            loginForm.classList.add('hidden');
            otpForm.classList.add('hidden');
            if (forgotRequestForm) forgotRequestForm.classList.add('hidden');
            if (forgotVerifyForm) forgotVerifyForm.classList.add('hidden');
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;

                try {
                    const res = await fetch(`${API_URL}/superadmin/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        tempMasterEmail = email;
                        loginForm.classList.add('hidden');
                        otpForm.classList.remove('hidden');
                        showCustomAlert('Matrix Active', 'Master keys dispatched. Enter precisely 6 digits to drop payload.', true);
                    } else {
                        showCustomAlert('Access Denied', data.message || 'Invalid Master Credentials', false);
                    }
                } catch (err) {
                    showCustomAlert('System Error', 'Could not reach the global API. Ensure server is online.', false);
                }
            });
        }

        if (otpForm) {
            otpForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const otp = document.getElementById('adminVerifyOtp').value.trim();

                try {
                    const res = await fetch(`${API_URL}/superadmin/login-verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: tempMasterEmail, otp })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        localStorage.setItem('superAdminToken', data.token);
                        window.location.href = 'dashboard-superadmin.html';
                    } else {
                        showCustomAlert('Authorization Blocked', data.message || 'Invalid 2FA Configuration.', false);
                    }
                } catch (err) {
                    showCustomAlert('System Error', 'Server link severed during decryption.', false);
                }
            });

            document.getElementById('backToMasterLogin').addEventListener('click', (e) => {
                e.preventDefault();
                hideAllForms();
                loginForm.classList.remove('hidden');
            });
        }

        // --- Forgot Password Flow ---
        const showForgotBtn = document.getElementById('showAdminForgotPassword');
        if (showForgotBtn) {
            showForgotBtn.addEventListener('click', (e) => {
                e.preventDefault();
                hideAllForms();
                forgotRequestForm.classList.remove('hidden');
            });
        }

        if (forgotRequestForm) {
            forgotRequestForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('adminForgotEmail').value.trim();

                try {
                    const res = await fetch(`${API_URL}/superadmin/forgot-password-request`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        tempMasterEmail = email;
                        hideAllForms();
                        forgotVerifyForm.classList.remove('hidden');
                        showCustomAlert('Recovery Signal', data.message, true);
                    } else {
                        showCustomAlert('Signal Blocked', data.message || 'Action rejected.', false);
                    }
                } catch(err) {
                    showCustomAlert('System Error', 'Could not reach server cluster for recovery.', false);
                }
            });

            document.getElementById('backToMasterLoginFromForgot').addEventListener('click', (e) => {
                e.preventDefault();
                hideAllForms();
                loginForm.classList.remove('hidden');
            });
        }

        if (forgotVerifyForm) {
            forgotVerifyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const otp = document.getElementById('adminForgotVerifyOtp').value.trim();
                const newPassword = document.getElementById('adminForgotNewPassword').value.trim();

                try {
                    const res = await fetch(`${API_URL}/superadmin/forgot-password-verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: tempMasterEmail, otp, newPassword })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        hideAllForms();
                        loginForm.classList.remove('hidden');
                        document.getElementById('loginEmail').value = tempMasterEmail;
                        showCustomAlert('Matrix Overwritten', data.message, true);
                    } else {
                        showCustomAlert('Reset Failed', data.message || 'Pin validation error.', false);
                    }
                } catch(err) {
                    showCustomAlert('System Error', 'Server offline.', false);
                }
            });
        }
    }

    // Dashboard Page Logic
    if (path.includes('dashboard-superadmin.html')) {
        const token = localStorage.getItem('superAdminToken');
        if (!token) {
            window.location.href = 'login-superadmin.html';
            return;
        }

        loadGlobalStats();
        loadTenantsGrid();

        const provisionForm = document.getElementById('provisionForm');
        if (provisionForm) {
            provisionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('tenantName').value;
                const subdomain = document.getElementById('tenantSubdomain').value;
                const adminName = document.getElementById('adminName').value;
                const adminEmail = document.getElementById('adminEmail').value;
                const adminPassword = document.getElementById('adminPassword').value;
                const primaryColor = document.getElementById('tenantPrimaryColor').value;

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

                if (!emailRegex.test(adminEmail)) {
                    showCustomAlert('Invalid Email', 'Please provide a valid administration email address with a domain (e.g. admin@example.com)', false);
                    return;
                }

                if (!passwordRegex.test(adminPassword)) {
                    showCustomAlert('Weak Admin Password', 'Password must be at least 8 chars long, contain 1 number, 1 uppercase letter, and 1 special character (@$!%*?&).', false);
                    return;
                }

                try {
                    const res = await fetch(`${API_URL}/superadmin/tenants`, {
                        method: 'POST',
                        headers: getSuperAdminHeaders(),
                        body: JSON.stringify({ name, subdomain, adminName, adminEmail, adminPassword, primaryColor })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        closeProvisionModal();
                        provisionForm.reset();
                        await showCustomAlert('Provisioning Success', `Library instance for '${name}' has been deployed. The Librarian can now login.`, true);
                        loadGlobalStats();
                        loadTenantsGrid();
                    } else {
                        showCustomAlert('Provisioning Failed', data.message, false);
                    }
                } catch (err) {
                    showCustomAlert('System Error', 'Failed to communicate with the provisioning engine.', false);
                }
            });
        }
    }
});

// Load Global Statistics
async function loadGlobalStats() {
    try {
        const res = await fetch(`${API_URL}/superadmin/stats`, {
            headers: getSuperAdminHeaders()
        });

        if (res.status === 401) {
            superAdminLogout();
            return;
        }

        const data = await res.json();
        if (res.ok) {
            document.getElementById('statTotalTenants').innerText = data.totalTenants;
            document.getElementById('statActiveTenants').innerText = data.activeTenants;
            document.getElementById('statTotalUsers').innerText = data.totalUsers.toLocaleString();
            document.getElementById('statTotalBooks').innerText = data.totalBooks.toLocaleString();
        }
    } catch (err) {
        console.error("Failed to load global stats", err);
    }
}

// Load Tenants Grid
async function loadTenantsGrid() {
    try {
        const res = await fetch(`${API_URL}/superadmin/tenants`, {
            headers: getSuperAdminHeaders()
        });
        const data = await res.json();

        if (res.ok) {
            const grid = document.getElementById('tenantsGrid');
            grid.innerHTML = '';

            data.forEach(tenant => {
                const isActive = tenant.isActive;
                const encodedTenant = encodeURIComponent(JSON.stringify(tenant));
                const card = document.createElement('div');
                card.className = 'tenant-card';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div class="tenant-badge ${isActive ? 'active' : 'suspended'}">
                            ${isActive ? 'Online' : 'Suspended'}
                        </div>
                        <button onclick="showTenantDetails('${encodedTenant}')" style="background: transparent; border: 1px solid var(--text-muted); color: var(--text-main); border-radius: 50%; width: 26px; height: 26px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="View Tenant Details">i</button>
                    </div>
                    <h3 style="color: var(--text-color); font-size: 1.2rem; margin-top: 1rem; margin-bottom: 0.2rem;">${tenant.name}</h3>
                    <p style="color: var(--primary); font-family: monospace; font-size: 0.9rem;">${tenant.subdomain}.loca.lt</p>
                    
                    <div class="tenant-stats">
                        <div class="t-stat">
                            <span>${tenant.stats.users}</span>
                            <small>Users</small>
                        </div>
                        <div class="t-stat">
                            <span>${tenant.stats.books}</span>
                            <small>Books</small>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                        <button onclick="toggleTenantStatus('${tenant._id}', ${isActive})" class="btn ${isActive ? 'btn-danger' : 'btn-primary'}" style="flex: 2; padding: 0.6rem;">
                            ${isActive ? 'Suspend' : 'Restore'}
                        </button>
                        <button onclick="deleteTenant('${tenant._id}')" class="btn" style="flex: 1; padding: 0.6rem; background: transparent; border: 1px solid var(--danger); color: var(--danger);" title="Permanently Delete Instance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto;">
                                <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Failed to load tenants", err);
    }
}

// Toggle Tenant Status
async function toggleTenantStatus(id, currentStatus) {
    const action = currentStatus ? "Suspend" : "Restore";
    const proceed = await showCustomConfirm(`Confirm ${action}`, `Are you sure you want to ${action.toLowerCase()} this institution? ${currentStatus ? 'All their users will be instantly locked out.' : 'Their system will be brought back online.'}`);

    if (!proceed) return;

    try {
        const res = await fetch(`${API_URL}/superadmin/tenants/${id}/toggle`, {
            method: 'PUT',
            headers: getSuperAdminHeaders()
        });

        if (res.ok) {
            loadGlobalStats();
            loadTenantsGrid();
        } else {
            const data = await res.json();
            showCustomAlert('Error', data.message, false);
        }
    } catch (err) {
        showCustomAlert('System Error', 'Could not change tenant status.', false);
    }
}

// Delete Tenant
async function deleteTenant(id) {
    const proceed = await showCustomConfirm(
        'Critical Destructive Action',
        'Are you absolutely sure you want to permanently delete this Institution? <b>This will wipe all their Settings, Users, Books, and Active Requests.</b><br><br>This action cannot be undone.'
    );

    if (!proceed) return;

    try {
        const res = await fetch(`${API_URL}/superadmin/tenants/${id}`, {
            method: 'DELETE',
            headers: getSuperAdminHeaders()
        });

        const data = await res.json();

        if (res.ok) {
            await showCustomAlert('Tenant Eradicated', data.message, true);
            loadGlobalStats();
            loadTenantsGrid();
        } else {
            showCustomAlert('Error', data.message || 'Deletion failed.', false);
        }
    } catch (err) {
        showCustomAlert('System Error', 'Could not communicate with the deletion engine.', false);
    }
}

// Provisioning Modal Controls
function openProvisionModal() {
    document.getElementById('provisionModal').classList.remove('hidden');
}

function closeProvisionModal() {
    document.getElementById('provisionModal').classList.add('hidden');
}

// Logout
function superAdminLogout() {
    localStorage.removeItem('superAdminToken');
    window.location.href = 'login-superadmin.html';
}

// View Tenant Details
function showTenantDetails(encodedTenant) {
    try {
        const tenant = JSON.parse(decodeURIComponent(encodedTenant));
        document.getElementById('detailName').textContent = tenant.name;
        document.getElementById('detailAdminName').textContent = tenant.adminName || 'Unknown';
        document.getElementById('detailAdminEmail').textContent = tenant.adminEmail || 'Unknown';
        document.getElementById('detailSubdomain').textContent = tenant.subdomain + '.loca.lt';

        // Handle nested optional branding colors safely
        let primaryColor = '#2563eb';
        if (tenant.brandingColors && tenant.brandingColors.primary) {
            primaryColor = tenant.brandingColors.primary;
        }

        document.getElementById('detailColorHex').textContent = primaryColor;
        document.getElementById('detailColorSwatch').style.backgroundColor = primaryColor;

        document.getElementById('tenantDetailsModal').classList.remove('hidden');
    } catch (e) {
        console.error("Failed to parse tenant for details modal", e);
    }
}
