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
                        await showCustomAlert('Matrix Active', 'Master keys dispatched. Enter precisely 6 digits to drop payload.', true);
                        otpForm.classList.remove('hidden');
                    } else {
                        await showCustomAlert('Access Denied', data.message || 'Invalid Master Credentials', false);
                    }
                } catch (err) {
                    await showCustomAlert('System Error', 'Could not reach the global API. Ensure server is online.', false);
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
                        await showCustomAlert('Authorization Blocked', data.message || 'Invalid 2FA Configuration.', false);
                    }
                } catch (err) {
                    await showCustomAlert('System Error', 'Server link severed during decryption.', false);
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
                        await showCustomAlert('Recovery Signal', data.message, true);
                        forgotVerifyForm.classList.remove('hidden');
                    } else {
                        await showCustomAlert('Signal Blocked', data.message || 'Action rejected.', false);
                    }
                } catch(err) {
                    await showCustomAlert('System Error', 'Could not reach server cluster for recovery.', false);
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
                        document.getElementById('loginEmail').value = tempMasterEmail;
                        await showCustomAlert('Matrix Overwritten', data.message, true);
                        loginForm.classList.remove('hidden');
                    } else {
                        await showCustomAlert('Reset Failed', data.message || 'Pin validation error.', false);
                    }
                } catch(err) {
                    await showCustomAlert('System Error', 'Server offline.', false);
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
                    const formData = new FormData();
                    formData.append('name', name);
                    formData.append('subdomain', subdomain);
                    formData.append('adminName', adminName);
                    formData.append('adminEmail', adminEmail);
                    formData.append('adminPassword', adminPassword);
                    formData.append('primaryColor', primaryColor);
                    
                    const logoFile = document.getElementById('tenantLogo').files[0];
                    if (logoFile) {
                        formData.append('logo', logoFile);
                    }

                    const res = await fetch(`${API_URL}/superadmin/tenants`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`
                            // Do NOT set Content-Type to application/json, fetch will auto-set multipart/form-data boundary
                        },
                        body: formData
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

        const settingsForm = document.getElementById('tenantSettingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('editTenantId').value;
                const name = document.getElementById('editTenantName').value;
                const subdomain = document.getElementById('editTenantSubdomain').value;
                const primaryColor = document.getElementById('editTenantPrimaryColor').value;
                const isActive = document.getElementById('editTenantIsActive').checked;

                try {
                    const formData = new FormData();
                    formData.append('name', name);
                    formData.append('subdomain', subdomain);
                    formData.append('primaryColor', primaryColor);
                    formData.append('isActive', isActive);
                    
                    const logoFile = document.getElementById('editTenantLogo').files[0];
                    if (logoFile) {
                        formData.append('logo', logoFile);
                    }

                    const res = await fetch(`${API_URL}/superadmin/tenants/${id}/settings`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`
                        },
                        body: formData
                    });
                    const data = await res.json();

                    if (res.ok) {
                        document.getElementById('tenantSettingsModal').classList.add('hidden');
                        await showCustomAlert('Settings Saved', data.message, true);
                        loadGlobalStats();
                        loadTenantsGrid();
                    } else {
                        showCustomAlert('Error', data.message || 'Failed to update settings', false);
                    }
                } catch (err) {
                    showCustomAlert('System Error', 'Could not communicate with the API.', false);
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
        let data = await res.json();

        if (res.ok) {
            if (!Array.isArray(data)) data = [];
            const grid = document.getElementById('tenantsGrid');
            grid.innerHTML = '';

            data.forEach(tenant => {
                const isActive = tenant.isActive;
                const encodedTenant = encodeURIComponent(JSON.stringify(tenant));
                const card = document.createElement('div');
                card.className = 'bg-card-bg border border-card-border rounded-xl p-6 transition-all duration-300 relative shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-primary hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)]';
                
                const badgeClass = isActive 
                    ? 'bg-success/10 text-success' 
                    : 'bg-danger/10 text-danger';

                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold ${badgeClass}">
                            ${isActive ? 'Online' : 'Suspended'}
                        </div>
                        <button onclick="showTenantDetails('${encodedTenant}')" class="bg-transparent border border-text-muted text-text-main rounded-full w-7 h-7 font-bold cursor-pointer flex items-center justify-center transition-colors hover:border-primary hover:text-primary" title="View Tenant Details">i</button>
                    </div>
                    <h3 class="text-text-main text-xl mt-4 mb-1 font-serif font-semibold">${tenant.name}</h3>
                    <p class="text-primary font-mono text-sm">${tenant.subdomain}.loca.lt</p>
                    
                    <div class="flex justify-between mt-6 pt-4 border-t border-card-border">
                        <div class="text-center">
                            <span class="block font-serif text-2xl font-semibold text-primary">${tenant.stats.users}</span>
                            <small class="text-text-muted text-xs uppercase tracking-[0.5px]">Users</small>
                        </div>
                        <div class="text-center">
                            <span class="block font-serif text-2xl font-semibold text-primary">${tenant.stats.books}</span>
                            <small class="text-text-muted text-xs uppercase tracking-[0.5px]">Books</small>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 mt-6">
                        <button onclick="toggleTenantStatus('${tenant._id}', ${isActive})" class="flex-[2] px-4 py-2 rounded-lg font-semibold uppercase tracking-[1px] transition-all text-white shadow-md hover:-translate-y-0.5 ${isActive ? 'bg-danger' : 'bg-primary'}">
                            ${isActive ? 'Suspend' : 'Restore'}
                        </button>
                        <button onclick="deleteTenant('${tenant._id}')" class="flex-1 px-4 py-2 rounded-lg transition-all bg-transparent border border-danger text-danger hover:bg-danger/10 flex justify-center items-center" title="Permanently Delete Instance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

let currentSelectedTenant = null;

// View Tenant Details
function showTenantDetails(encodedTenant) {
    try {
        const tenant = JSON.parse(decodeURIComponent(encodedTenant));
        currentSelectedTenant = tenant;
        document.getElementById('detailName').textContent = tenant.name;
        document.getElementById('detailAdminName').textContent = tenant.adminName || 'Unknown';
        document.getElementById('detailAdminEmail').textContent = tenant.adminEmail || 'Unknown';
        document.getElementById('detailSubdomain').textContent = tenant.subdomain + '.loca.lt';

        const logoImg = document.getElementById('detailLogo');
        const noLogoText = document.getElementById('detailNoLogo');
        if (tenant.logoUrl) {
            logoImg.src = tenant.logoUrl;
            logoImg.classList.remove('hidden');
            noLogoText.classList.add('hidden');
        } else {
            logoImg.src = '';
            logoImg.classList.add('hidden');
            noLogoText.classList.remove('hidden');
        }

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

function openTenantSettings() {
    if (!currentSelectedTenant) return;

    document.getElementById('editTenantId').value = currentSelectedTenant._id;
    document.getElementById('editTenantName').value = currentSelectedTenant.name;
    document.getElementById('editTenantSubdomain').value = currentSelectedTenant.subdomain;

    let primaryColor = '#2563eb';
    if (currentSelectedTenant.brandingColors && currentSelectedTenant.brandingColors.primary) {
        primaryColor = currentSelectedTenant.brandingColors.primary;
    }
    document.getElementById('editTenantPrimaryColor').value = primaryColor;
    document.getElementById('editTenantIsActive').checked = currentSelectedTenant.isActive;

    document.getElementById('tenantDetailsModal').classList.add('hidden');
    document.getElementById('tenantSettingsModal').classList.remove('hidden');
}
