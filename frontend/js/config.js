// Strict Session Shredding on F5 / Page Refresh
const navEntries = performance.getEntriesByType("navigation");
const isReload = (navEntries.length > 0 && navEntries[0].type === "reload") || 
                 (window.performance && window.performance.navigation && window.performance.navigation.type === 1);

if (isReload) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('userId');
    localStorage.removeItem('superAdminToken');
}

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

// --- 1. GLOBAL TOAST NOTIFICATION OVERRIDE ---
function showCustomToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '999999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    // Heuristic Color Classification
    let borderLeft = '4px solid #00cc99';
    let icon = '✨';
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes('error') || msgLower.includes('invalid') || msgLower.includes('failed') || msgLower.includes('weak') || msgLower.includes('expired')) {
        borderLeft = '4px solid #ff4444';
        icon = '⚠️';
    } else if (msgLower.includes('waitlist') || msgLower.includes('already')) {
        borderLeft = '4px solid #f59e0b';
        icon = '⏳';
    }

    toast.style.background = 'var(--surface)';
    if(getComputedStyle(document.body).getPropertyValue('--surface') === '') {
        toast.style.background = '#1e293b'; // Fallback
    }

    toast.style.color = '#f8fafc';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    toast.style.borderLeft = borderLeft;
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.fontFamily = "'Segoe UI', sans-serif";
    toast.style.fontSize = '0.95rem';
    toast.style.maxWidth = '350px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
    });

    // Auto delete
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 400);
    }, 4500);
}

// Intercept all native alerts dynamically!
window.alert = function(message) {
    showCustomToast(message);
};

// --- 2. GLOBAL ACTIVITY IDLE MONITOR ---
class IdleMonitor {
    constructor(timeoutMinutes) {
        this.timeoutMs = timeoutMinutes * 60 * 1000;
        this.timer = null;
        this.isSuperAdmin = window.location.pathname.includes('superadmin.html');
        this.startMonitor();
    }

    startMonitor() {
        // Only run if the user is actually signed in (so it doesn't auto-refresh the login page infinitely)
        const tokenKey = this.isSuperAdmin ? 'superAdminToken' : 'token';
        if (!localStorage.getItem(tokenKey)) return;

        // Listen for all physical activity traces
        const resetEvents = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
        resetEvents.forEach(evt => {
            window.addEventListener(evt, () => this.resetTimer(), { passive: true });
        });

        this.resetTimer();
    }

    resetTimer() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.logout(), this.timeoutMs);
    }

    logout() {
        // Violent ejection protocol: shred the secure tokens permanently
        if (this.isSuperAdmin) {
            localStorage.removeItem('superAdminToken');
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('name');
            localStorage.removeItem('userId');
        }
        
        // Let them know why they got booted!
        showCustomToast('Security Trigger: Session expired due to 5 minutes of inactivity.', 'error');
        
        setTimeout(() => {
            window.location.href = this.isSuperAdmin ? 'login-superadmin.html' : 'index.html';
        }, 2000);
    }
}

// Boot the monitor globally (Strict 5 Minute Threshold).
document.addEventListener('DOMContentLoaded', () => {
    new IdleMonitor(5);
});
