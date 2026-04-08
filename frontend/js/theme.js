// theme.js
// Handles light/dark mode toggling and persistence

// --- SaaS Dynamic Branding ---
async function initTenantBranding() {
    try {
        // We use the same API_URL fallback pattern as config.js
        const apiUrl = window.API_URL || 'http://localhost:5000/api';

        // Exclude SuperAdmin pages from tenant styling
        if (window.location.pathname.includes('superadmin')) return;

        // Extract the targeted subdomain from local memory (used for local testing in lieu of real DNS)
        const currentSubdomain = localStorage.getItem('subdomain') || 'default';

        const res = await fetch(`${apiUrl}/tenant/info`, {
            headers: {
                'x-tenant-subdomain': currentSubdomain
            }
        });

        if (res.ok) {
            const tenant = await res.json();

            // 1. Inject Custom Brand Color into CSS Variables
            if (tenant.brandingColors && tenant.brandingColors.primary) {
                const hex = tenant.brandingColors.primary;
                document.documentElement.style.setProperty('--app-primary', hex);

                // Construct a glow color (rgba with 0.2 opacity) based on the hex
                // Since hex to rgba natively in CSS is tricky, we'll just use a subtle generic glow 
                // or if it's a standard hex (#RRGGBB), we could parse it, but for safety:
                document.documentElement.style.setProperty('--app-primary-glow', `${hex}33`); // Append 33 for ~20% opacity
            }

            // 2. Inject Custom Institution Name into Navbar and Titles
            const brandElements = document.querySelectorAll('.navbar-brand-text');
            brandElements.forEach(el => {
                el.textContent = tenant.name;
            });

            // Update document title if on login page
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                document.title = `${tenant.name} | Library Portal`;
            }
            
            // 3. Inject Configured Local Currency
            window.tenantCurrency = tenant.fineConfig?.currency || '₹';
        }
    } catch (err) {
        console.error("Failed to load tenant branding:", err);
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    if (theme === 'light') {
        // Show Moon icon (to switch back to dark)
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    } else {
        // Show Sun icon (to switch to light)
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }
}

// Run immediately to prevent FOUC (Flash of Unstyled Content)
initTheme();
initTenantBranding();

// Ensure the icon is correct when DOM is fully loaded in case the button wasn't parsed yet
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    // Branding might need a second pass if DOM elements like navbar text weren't ready
    initTenantBranding();
});

// --- Custom Modal System ---
function showCustomAlert(title, message, isSuccess = true) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const titleEl = document.getElementById('customModalTitle');
        const messageEl = document.getElementById('customModalMessage');
        const inputContainer = document.getElementById('customModalInputContainer');
        const confirmBtn = document.getElementById('customModalConfirmBtn');
        const cancelBtn = document.getElementById('customModalCancelBtn');

        if (!modal) return resolve(true); // Fallback if modal missing

        titleEl.textContent = title;
        titleEl.style.color = isSuccess ? 'var(--primary)' : 'var(--danger)';
        messageEl.innerHTML = message;

        inputContainer.classList.add('hidden');
        cancelBtn.classList.add('hidden');

        modal.classList.remove('hidden');

        // Prevent memory leaks by cloning nodes to remove old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            resolve(true);
        }, { once: true });
    });
}

function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const titleEl = document.getElementById('customModalTitle');
        const messageEl = document.getElementById('customModalMessage');
        const inputContainer = document.getElementById('customModalInputContainer');
        const confirmBtn = document.getElementById('customModalConfirmBtn');
        const cancelBtn = document.getElementById('customModalCancelBtn');

        if (!modal) return resolve(confirm(message)); // Fallback

        titleEl.textContent = title;
        titleEl.style.color = 'var(--primary)';
        messageEl.innerHTML = message;

        inputContainer.classList.add('hidden');
        cancelBtn.classList.remove('hidden');

        modal.classList.remove('hidden');

        // Remove old event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            resolve(true);
        }, { once: true });

        newCancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            resolve(false);
        }, { once: true });
    });
}

function showCustomPrompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const titleEl = document.getElementById('customModalTitle');
        const messageEl = document.getElementById('customModalMessage');
        const inputContainer = document.getElementById('customModalInputContainer');
        const inputEl = document.getElementById('customModalInput');
        const confirmBtn = document.getElementById('customModalConfirmBtn');
        const cancelBtn = document.getElementById('customModalCancelBtn');

        if (!modal) return resolve(null); // Fallback

        titleEl.textContent = title;
        titleEl.style.color = 'var(--primary)';
        messageEl.innerHTML = message;

        inputEl.value = defaultValue;
        inputContainer.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');

        modal.classList.remove('hidden');
        setTimeout(() => inputEl.focus(), 50); // Focus input slightly after render

        // Remove old event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            resolve(inputEl.value);
        }, { once: true });

        newCancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            resolve(null);
        }, { once: true });

        // Handle 'Enter' key submit
        inputEl.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                newConfirmBtn.click();
            }
        };
    });
}
