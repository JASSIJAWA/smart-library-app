// Check Auth
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || role !== 'Member') {
    window.location.href = 'index.html';
}

document.getElementById('userName').innerText = localStorage.getItem('name');

const savedLogo = localStorage.getItem('tenantLogo');
if (savedLogo) {
    const logoImg = document.getElementById('navTenantLogo');
    if (logoImg) {
        logoImg.src = savedLogo;
        logoImg.style.display = 'block';
    }
}

const savedBrand = localStorage.getItem('tenantName');
if (savedBrand) {
    const brandTexts = document.querySelectorAll('.navbar-brand-text');
    brandTexts.forEach(el => el.innerText = savedBrand);
}

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// Load saved view mode on boot
document.addEventListener('DOMContentLoaded', () => {
    const savedMode = localStorage.getItem('viewMode') || 'grid';
    if (document.getElementById('gridViewBtn')) {
        toggleViewMode(savedMode);
    }
});

// In-Memory Cache Flags
let booksLoaded = false;
let requestsLoaded = false;

// UI Toggles
function showSection(id) {
    ['booksSection', 'requestsSection'].forEach(s => {
        document.getElementById(s).classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');

    if (id === 'booksSection' && !booksLoaded) loadBooks();
    if (id === 'requestsSection' && !requestsLoaded) loadMyRequests();
}

// View Mode Toggles
function toggleViewMode(mode) {
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    const grid = document.getElementById('booksGrid');

    if (mode === 'list') {
        grid.classList.add('list-view');
        listBtn.classList.add('active');
        listBtn.style.background = 'var(--card-bg)';
        listBtn.style.color = 'var(--primary)';

        gridBtn.classList.remove('active');
        gridBtn.style.background = 'transparent';
        gridBtn.style.color = 'var(--text-muted)';

        localStorage.setItem('viewMode', 'list');
    } else {
        grid.classList.remove('list-view');
        gridBtn.classList.add('active');
        gridBtn.style.background = 'var(--card-bg)';
        gridBtn.style.color = 'var(--primary)';

        listBtn.classList.remove('active');
        listBtn.style.background = 'transparent';
        listBtn.style.color = 'var(--text-muted)';

        localStorage.setItem('viewMode', 'grid');
    }
}

// ---------------- UNIVERSAL SEARCH ----------------
function toggleNavSearch() {
    const input = document.getElementById('navSearchInput');
    input.classList.toggle('active');
    if (input.classList.contains('active')) {
        input.focus();
    } else {
        input.value = '';
        loadBooks(); // Reset list when closed
    }
}

let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = document.getElementById('navSearchInput').value;

        // Auto-switch to books view if user is searching
        if (query.trim().length > 0) {
            const isHidden = document.getElementById('booksSection').classList.contains('hidden');
            if (isHidden) showSection('booksSection');
        }

        loadBooks(query);
    }, 400); // Wait 400ms after user stops typing to fetch
}

// Fetch Books
async function loadBooks(searchQuery = '', silent = false) {
    const booksGrid = document.getElementById('booksGrid');
    if (!silent) {
        booksGrid.innerHTML = '<p class="col-span-full text-center text-primary py-8">Loading books...</p>';
    }

    try {
        const url = searchQuery
            ? `${API_URL}/books?search=${encodeURIComponent(searchQuery)}`
            : `${API_URL}/books`;

        const res = await fetch(url, { headers: getHeaders() });
        let books = await res.json();

        if (!Array.isArray(books)) {
            console.error('API Error: Expected array of books, got:', books);
            books = [];
        }

        booksGrid.innerHTML = '';

        // Update the book count badge
        const badge = document.getElementById('bookCountBadge');
        if (badge) {
            badge.innerText = `${books.length} Book${books.length !== 1 ? 's' : ''}`;
        }

        if (books.length === 0) {
            booksGrid.innerHTML = '<p class="col-span-full text-center text-text-muted py-8">No books found matching your search.</p>';
            return;
        }
        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'bg-card-bg border border-card-border rounded-xl p-4 flex flex-col items-center transition-all duration-300 shadow-md hover:-translate-y-1 hover:border-primary relative duration-300';
            // Render beautiful fallback if no image
            const imageHtml = book.imageUrl
                ? `<img src="${book.imageUrl}" alt="${book.title} cover" class="w-full h-48 object-cover rounded-lg mb-4 shadow-sm list-view_img">`
                : `<div class="w-full h-48 rounded-lg mb-4 shadow-sm bg-bg-dark border border-card-border flex flex-col items-center justify-center py-4 list-view_img">
                     <span class="text-4xl opacity-50">📚</span>
                     <span class="text-xs mt-2 text-center px-4 text-text-muted truncate w-full">${book.title}</span>
                   </div>`;

            card.innerHTML = `
                ${imageHtml}
                <div class="flex flex-col flex-1 w-full text-center w-full min-w-0">
                    <h4 class="text-text-main text-lg font-serif font-bold mb-1 w-full truncate list-view_h4" title="${book.title}">${book.title}</h4>
                    <p class="text-text-muted text-sm mb-2 w-full truncate list-view_p">by ${book.author}</p>
                    <div class="mb-3"><span class="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full">${book.category}</span></div>
                    <p class="text-sm mb-2 w-full">
                        Stock: ${book.stock > 0 ? `<span class="text-success font-semibold px-1">${book.stock} Available</span>` : '<span class="text-danger font-semibold px-1">Out of Stock</span>'}
                    </p>
                    ${book.stock <= 0 && book.expectedReturn ? `
                    <div class="mb-6 bg-warning/10 border border-warning/30 rounded-lg p-2 flex items-center gap-2 mt-auto w-full">
                        <span class="text-xl">⏳</span>
                        <div class="text-left leading-tight w-full truncate">
                            <span class="block text-[0.75rem] text-warning font-semibold uppercase tracking-[0.5px]">Expected Return</span>
                            <span class="text-text-main text-sm font-medium w-full truncate">${new Date(book.expectedReturn).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                    ` : '<div class="mb-6 mt-auto"></div>'}
                    <button class="w-full mt-auto bg-primary text-bg-dark font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity uppercase tracking-[0.5px] shadow-sm hover:shadow-md"
                        onclick="requestBook('${book._id}')">
                        ${book.stock === 0 ? 'Waitlist <span class="text-lg leading-none">⏳</span>' : 'Request <span class="text-lg leading-none">→</span>'}
                    </button>
                </div>
            `;
            booksGrid.appendChild(card);
        });

        // Mark cache as loaded only if it was a generic non-search fetch
        if (!searchQuery) { booksLoaded = true; }

    } catch (err) {
        console.error('Error fetching books:', err);
        booksGrid.innerHTML = '<p class="col-span-full text-center text-danger py-8">Error loading books.</p>';
    }
}

// Request Book
async function requestBook(bookId) {
    if (!await showCustomConfirm('Confirm Request', 'Are you sure you want to request this book?')) return;

    try {
        const res = await fetch(`${API_URL}/requests`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ bookId })
        });
        const data = await res.json();

        if (res.ok) {
            if (data.status === 'Waitlisted') {
                 await showCustomAlert('Waitlisted', 'There are no active copies right now. You have been successfully placed on the Priority Waitlist!', true);
            } else {
                 await showCustomAlert('Success', 'Book requested successfully!', true);
            }
            requestsLoaded = false; // Invalidate cache so it shows up in "My Requests"
            // Re-fetch books to update stock logic locally
            booksLoaded = false;
            loadBooks('', true);
        } else {
            await showCustomAlert('Request Failed', data.message || 'Error requesting book', false);
        }
    } catch (err) {
        console.error(err);
        await showCustomAlert('Error', 'A network error occurred while requesting the book.', false);
    }
}

// Fetch Requests
async function loadMyRequests(silent = false) {
    const tableBody = document.querySelector('#requestsTable tbody');
    if (!silent) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-text-muted">Loading...</td></tr>';
    }

    try {
        const res = await fetch(`${API_URL}/requests`, {
            headers: getHeaders()
        });
        let requests = await res.json();

        if (!Array.isArray(requests)) {
            console.error('API Error: Expected array of requests, got:', requests);
            requests = [];
        }

        requestsLoaded = true;

        tableBody.innerHTML = '';
        requests.forEach(req => {
            // Assign status col color
            let statusColor = "text-text-muted";
            if (req.status === 'Requested') statusColor = "text-secondary";
            if (req.status === 'Approved') statusColor = "text-success";
            if (req.status === 'Issued') statusColor = "text-primary";
            if (req.status === 'Rejected') statusColor = "text-danger";
            if (req.status === 'Returned') statusColor = "text-text-muted";
            if (req.status === 'Overdue') statusColor = "text-warning";

            const row = document.createElement('tr');
            row.className = "hover:bg-white/5 transition-colors";
            row.innerHTML = `
                <td class="py-4 px-4 border-b border-border-color text-sm text-text-main font-medium">${req.bookId ? req.bookId.title : 'Deleted Book'}</td>
                <td class="py-4 px-4 border-b border-border-color text-sm text-text-main">${req.bookId ? req.bookId.author : '-'}</td>
                <td class="py-4 px-4 border-b border-border-color text-sm font-bold tracking-[1px] uppercase ${statusColor}">${req.status}</td>
                <td class="py-4 px-4 border-b border-border-color text-sm font-mono tracking-[2px] text-primary font-bold hidden-mobile">
                    ${req.otp || '-'}
                </td>
                <td class="py-4 px-4 border-b border-border-color text-sm text-text-muted hidden-mobile">${req.issueDate ? new Date(req.issueDate).toLocaleDateString() : '-'}</td>
                <td class="py-4 px-4 border-b border-border-color text-sm text-text-muted">${req.dueDate ? new Date(req.dueDate).toLocaleDateString() : '-'}</td>
                <td class="py-4 px-4 border-b border-border-color text-sm text-text-muted hidden-mobile">${req.returnDate ? new Date(req.returnDate).toLocaleDateString() : '-'}</td>
                <td class="py-4 px-4 border-b border-border-color text-sm text-text-main">${req.fineAmount > 0 ? (window.tenantCurrency || '₹') + req.fineAmount : '-'}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-danger">Error loading requests</td></tr>';
    }
}

// Initial Load
loadBooks();
loadMyRequests();

// Real-Time WebSocket Sync
const socket = io(SOCKET_URL);

// When a librarian modifies a request (Approves/Rejects/Issues)
socket.on('status_update', () => {
    // Only refresh the section if it is currently visible, otherwise invalidate cache
    if (!document.getElementById('requestsSection').classList.contains('hidden')) {
        loadMyRequests(true);
    } else {
        requestsLoaded = false;
    }

    // Update live stock counts/ETA if a book was just issued or returned
    if (!document.getElementById('booksSection').classList.contains('hidden')) {
        const searchInput = document.getElementById('navSearchInput');
        if (!searchInput || searchInput.value.trim() === '') {
            loadBooks('', true);
        }
    } else {
        booksLoaded = false;
    }
});
