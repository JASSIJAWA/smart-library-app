// Check Auth
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || role !== 'Librarian') {
    window.location.href = 'index.html';
}

document.getElementById('userName').innerText = localStorage.getItem('name');

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// In-Memory Cache Flags
let analyticsLoaded = false;
let booksLoaded = false;
let categoriesLoaded = false;
let requestsLoaded = false;

// UI Toggles
function showSection(id) {
    ['overviewSection', 'booksSection', 'categoriesSection', 'requestsSection'].forEach(s => {
        document.getElementById(s).classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');

    // Auto load data for section conditionally
    if (id === 'overviewSection' && !analyticsLoaded) loadAnalytics();
    if (id === 'booksSection' && !booksLoaded) { loadBooks(); loadCategoriesDropdown(); }
    if (id === 'categoriesSection' && !categoriesLoaded) loadCategories();
    if (id === 'requestsSection' && !requestsLoaded) loadRequests();
}

// ---------------- ANALYTICS ----------------
async function loadAnalytics() {
    try {
        const res = await fetch(`${API_URL}/analytics`, { headers: getHeaders() });
        const data = await res.json();

        document.getElementById('totalBooks').innerText = data.totalBooks;
        document.getElementById('totalIssued').innerText = data.totalIssued;
        document.getElementById('totalOverdue').innerText = data.totalOverdue;
        document.getElementById('totalFine').innerText = (window.tenantCurrency || '₹') + data.totalFine;

        analyticsLoaded = true;
    } catch (err) {
        console.error(err);
    }
}

// ---------------- CATEGORIES ----------------
async function loadCategories() {
    const tbody = document.querySelector('#categoriesTable tbody');
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/categories`, { headers: getHeaders() });
        const data = await res.json();

        data.forEach(cat => {
            const row = `<tr>
                <td>${cat.name}</td>
                <td><button class="btn btn-danger" onclick="deleteCategory('${cat._id}')">Delete</button></td>
            </tr>`;
            tbody.innerHTML += row;
        });

        categoriesLoaded = true;
    } catch (err) {
        console.error(err);
    }
}

document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('categoryName').value;

    try {
        const res = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            alert('Category added');
            loadCategories();
            loadCategoriesDropdown(); // Sync Book Add Dropdown
            e.target.reset();
        } else {
            alert('Error adding category');
        }
    } catch (err) { console.error(err); }
});

async function deleteCategory(id) {
    if (!confirm('Delete this category?')) return;
    try {
        await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE', headers: getHeaders() });
        loadCategories();
        loadCategoriesDropdown(); // Sync Book Add Dropdown
    } catch (err) { console.error(err); }
}

// ---------------- BOOKS ----------------
async function loadCategoriesDropdown() {
    const select = document.getElementById('bookCategory');
    try {
        const res = await fetch(`${API_URL}/categories`, { headers: getHeaders() });
        const data = await res.json();
        select.innerHTML = data.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    } catch (err) { console.error(err); }
}

let searchTimeout;

// Called by the search bar in navbar
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
    }, 400);
}

// Called by the inline search bar above the directory
function debounceInlineSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = document.getElementById('inlineSearchInput').value;
        loadBooks(query);
    }, 400);
}

// Called by the requests search bar
function debounceRequestSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = document.getElementById('searchRequestInput').value;
        loadRequests(false, query);
    }, 400);
}

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

// Grid vs List view mode
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

        localStorage.setItem('librarianViewMode', 'list');
    } else {
        grid.classList.remove('list-view');
        gridBtn.classList.add('active');
        gridBtn.style.background = 'var(--card-bg)';
        gridBtn.style.color = 'var(--primary)';

        listBtn.classList.remove('active');
        listBtn.style.background = 'transparent';
        listBtn.style.color = 'var(--text-muted)';

        localStorage.setItem('librarianViewMode', 'grid');
    }
}

// Load preference on startup
document.addEventListener('DOMContentLoaded', () => {
    const savedMode = localStorage.getItem('librarianViewMode') || 'grid';
    if (document.getElementById('gridViewBtn')) {
        toggleViewMode(savedMode);
    }
});

async function loadBooks(searchQuery = '', silent = false) {
    const grid = document.getElementById('booksGrid');
    if (!silent) {
        grid.innerHTML = '<div style="text-align:center; width:100%; grid-column: 1/-1; padding: 2rem;"><span class="spinner" style="display:inline-block; width:30px; height:30px; border:3px solid var(--primary); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></span></div>';
    }

    try {
        let url = `${API_URL}/books`;
        if (searchQuery) {
            url += `?search=${encodeURIComponent(searchQuery)}`;
        }
        const res = await fetch(url, { headers: getHeaders() });
        const data = await res.json();

        grid.innerHTML = '';

        // Update the book count badge
        const badge = document.getElementById('bookCountBadge');
        if (badge) {
            badge.innerText = `${data.length} Book${data.length !== 1 ? 's' : ''}`;
        }

        if (data.length === 0) {
            grid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1/-1; color: var(--text-muted);">No books found matching your search.</p>';
            return;
        }

        data.forEach(book => {
            const isAvailable = book.stock > 0;
            const stockColor = isAvailable ? 'var(--success)' : 'var(--danger)';
            const stockText = isAvailable ? `${book.stock} Available` : 'Out of Stock';

            // Generate fallback cover if no image exists
            const defaultCover = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="400" height="600" fill="%232d2d3a"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="%23e0e0e0" text-anchor="middle" dominant-baseline="middle">No Cover</text></svg>`;
            const imgUrl = book.imageUrl || defaultCover;

            const encodedBook = encodeURIComponent(JSON.stringify(book));
            const card = `
                <div class="book-card">
                    <img src="${imgUrl}" alt="${book.title} cover" class="book-cover">
                    <h4 class="book-title" title="${book.title}">${book.title}</h4>
                    <p class="book-author">by ${book.author}</p>
                    <span class="book-category">${book.category}</span>
                    <p class="book-stock" style="color: ${stockColor}; font-weight: 500;">Stock: ${stockText}</p>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem; width: 100%;">
                        <button class="btn btn-primary" style="flex: 1; padding: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.3rem;" onclick="openEditModal('${encodedBook}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Modify
                        </button>
                        <button class="btn btn-danger" style="flex: 1; padding: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.3rem;" onclick="deleteBook('${book._id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;
            grid.innerHTML += card;
        });

        // Mark cache as loaded only if it was a generic non-search fetch
        if (!searchQuery) { booksLoaded = true; }

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color: var(--danger); text-align: center; width: 100%; grid-column: 1/-1;">Failed to load books.</p>';
    }
}



document.getElementById('addBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const book = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        category: document.getElementById('bookCategory').value,
        stock: document.getElementById('bookStock').value,
        isbn: document.getElementById('scanIsbn').value,
        imageUrl: document.getElementById('bookImageUrl').value
    };

    try {
        const res = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(book)
        });
        if (res.ok) {
            alert('Book added');
            booksLoaded = false;
            loadBooks();
            e.target.reset();
        } else {
            alert('Error adding book');
        }
    } catch (err) { console.error(err); }
});

// ---------------- MODIFY BOOK LOGIC ----------------
function openEditModal(encodedBook) {
    const book = JSON.parse(decodeURIComponent(encodedBook));

    // Populate form fields
    document.getElementById('editBookId').value = book._id;
    document.getElementById('editBookTitle').value = book.title;
    document.getElementById('editBookAuthor').value = book.author;
    document.getElementById('editBookStock').value = book.stock;
    document.getElementById('editBookImageUrl').value = book.imageUrl || '';

    // Load categories into select and set the active one
    const select = document.getElementById('editBookCategory');
    fetch(`${API_URL}/categories`, { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
            select.innerHTML = data.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            select.value = book.category; // Set correctly after load
        })
        .catch(err => console.error(err));

    document.getElementById('editBookModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editBookModal').classList.add('hidden');
}

// Close on outside click
document.getElementById('editBookModal').addEventListener('click', (e) => {
    if (e.target.id === 'editBookModal') closeEditModal();
});

document.getElementById('editBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editBookId').value;
    const updatedBook = {
        title: document.getElementById('editBookTitle').value,
        author: document.getElementById('editBookAuthor').value,
        category: document.getElementById('editBookCategory').value,
        stock: document.getElementById('editBookStock').value,
        imageUrl: document.getElementById('editBookImageUrl').value
    };

    try {
        const res = await fetch(`${API_URL}/books/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updatedBook)
        });
        if (res.ok) {
            alert('Book modified successfully');
            closeEditModal();
            booksLoaded = false;
            loadBooks(document.getElementById('inlineSearchInput').value); // Reload with current search
        } else {
            alert('Error modifying book');
        }
    } catch (err) { console.error(err); }
});

async function deleteBook(id) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
        await fetch(`${API_URL}/books/${id}`, { method: 'DELETE', headers: getHeaders() });
        booksLoaded = false;
        loadBooks(document.getElementById('inlineSearchInput').value); // Maintain search state on reload
    } catch (err) { console.error(err); }
}

// ---------------- SMART SCANNER ----------------
async function fetchBookDetails(silent = false) {
    const isbnInput = document.getElementById('scanIsbn');
    const fetchBtn = document.getElementById('fetchBtn');
    const titleInput = document.getElementById('bookTitle');
    const authorInput = document.getElementById('bookAuthor');
    const categorySelect = document.getElementById('bookCategory');
    const coverContainer = document.getElementById('coverPreviewContainer');
    const coverPlaceholder = document.getElementById('coverPlaceholderText');
    const coverImg = document.getElementById('coverPreviewImg');
    const hiddenUrlInput = document.getElementById('bookImageUrl');

    const isbn = isbnInput.value.trim();
    if (!isbn) {
        if (!silent) alert("Please enter or scan an ISBN first.");
        return "NO_ISBN";
    }

    const originalBtnText = fetchBtn.innerHTML;
    fetchBtn.innerHTML = '<span class="spinner" style="display:inline-block; width:16px; height:16px; border:2px solid; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></span>';
    fetchBtn.disabled = true;

    try {
        // --- 0. Pre-Check: Does book already exist in our DB? ---
        const dbRes = await fetch(`${API_URL}/books?isbn=${encodeURIComponent(isbn)}`, { headers: getHeaders() });
        const dbBooks = await dbRes.json();

        if (dbBooks && dbBooks.length > 0) {
            const existingBook = dbBooks[0];
            fetchBtn.innerHTML = originalBtnText; // Reset button before prompt
            fetchBtn.disabled = false;

            if (silent) {
                // Instantly increment stock in bulk mode
                const stockRes = await fetch(`${API_URL}/books/${existingBook._id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ ...existingBook, stock: existingBook.stock + 1 })
                });
                return stockRes.ok ? "DUPLICATE_INCREMENTED" : "ERROR";
            }

            const confirmAdd = await showCustomConfirm(
                "Already in database",
                `The book <b>${existingBook.title}</b> is already in your library inventory.<br><br>Would you like to instantly increase its stock by 1 instead of duplicating it?`
            );

            if (confirmAdd) {
                const stockRes = await fetch(`${API_URL}/books/${existingBook._id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ ...existingBook, stock: existingBook.stock + 1 })
                });

                if (stockRes.ok) {
                    await showCustomAlert("Stock Increased", `Successfully increased the stock of <b>${existingBook.title}</b> to ${existingBook.stock + 1}.`, true);
                    document.getElementById('addBookForm').reset();
                    resetCoverPreview();
                    booksLoaded = false;
                    loadBooks(document.getElementById('inlineSearchInput').value);
                } else {
                    await showCustomAlert("Error", "Failed to increase stock on the server.", false);
                }
            }
            return "DUPLICATE_PROCESSED"; // Halt the fetch process completely
        }

        let bookDetails = null;

        // Stage 1: Google Books (Strict ISBN Search)
        let response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
        let data = await response.json();

        if (data.totalItems > 0) {
            bookDetails = data.items[0].volumeInfo;
        } else {
            // Stage 2: Google Books (Broad Search) - Catch books miscategorized in Google's DB
            response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${isbn}`);
            data = await response.json();

            if (data.totalItems > 0) {
                bookDetails = data.items[0].volumeInfo;
            } else {
                // Stage 3: Open Library API (Tertiary Fallback)
                const olResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
                const olData = await olResponse.json();
                const olKey = `ISBN:${isbn}`;

                if (olData[olKey]) {
                    const olBook = olData[olKey];
                    // Map Open Library format to our expected Google Books format for unified processing
                    bookDetails = {
                        title: olBook.title,
                        authors: olBook.authors ? olBook.authors.map(a => a.name) : null,
                        categories: olBook.subjects ? olBook.subjects.map(s => s.name) : null,
                        imageLinks: olBook.cover ? { thumbnail: olBook.cover.large || olBook.cover.medium } : null
                    };
                } else {
                    // Stage 4: Open Library (Deep Search Fallback)
                    const olSearchRes = await fetch(`https://openlibrary.org/search.json?q=${isbn}`);
                    const olSearchData = await olSearchRes.json();

                    if (olSearchData.docs && olSearchData.docs.length > 0) {
                        const olsBook = olSearchData.docs[0];
                        bookDetails = {
                            title: olsBook.title,
                            authors: olsBook.author_name ? olsBook.author_name : null,
                            categories: olsBook.subject ? olsBook.subject : null,
                            imageLinks: olsBook.cover_i ? { thumbnail: `https://covers.openlibrary.org/b/id/${olsBook.cover_i}-M.jpg` } : null
                        };
                    } else {
                        // Stage 5: Crossref API (Academic Textbooks and Journals)
                        const crRes = await fetch(`https://api.crossref.org/works?filter=isbn:${isbn}`);
                        const crData = await crRes.json();

                        if (crData.message && crData.message.items && crData.message.items.length > 0) {
                            const crBook = crData.message.items[0];
                            bookDetails = {
                                title: crBook.title ? crBook.title[0] : null,
                                authors: crBook.author ? crBook.author.map(a => `${a.given} ${a.family}`) : null,
                                categories: crBook.subject ? crBook.subject : null,
                                imageLinks: null // Crossref usually lacks covers
                            };
                        }
                    }
                }
            }
        }

        if (!bookDetails) {
            if (!silent) alert("No book found for this ISBN across multiple databases. Please enter details manually.");
            resetCoverPreview();
            return "NOT_FOUND";
        }

        // Auto-fill Title
        if (bookDetails.title) titleInput.value = bookDetails.title;

        // Auto-fill Author
        if (bookDetails.authors && bookDetails.authors.length > 0) {
            authorInput.value = bookDetails.authors[0];
        }

        // Auto-fill Category (if matches our dropdown, or generic)
        if (bookDetails.categories && bookDetails.categories.length > 0) {
            const apiCat = bookDetails.categories[0];
            let matchFound = false;

            // Try simplistic match: find if it exists in our dropdown
            Array.from(categorySelect.options).forEach(opt => {
                if (opt.value.toLowerCase().includes(apiCat.toLowerCase()) || apiCat.toLowerCase().includes(opt.value.toLowerCase())) {
                    categorySelect.value = opt.value;
                    matchFound = true;
                }
            });

            // If no match, dynamically save the Category to the database so it isn't skipped
            if (!matchFound) {
                try {
                    console.log(`Auto-creating new category: ${apiCat}`);
                    const catRes = await fetch(`${API_URL}/categories`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({ name: apiCat })
                    });

                    if (catRes.ok) {
                        // Refresh both the dropdown and the backend table UI
                        await loadCategoriesDropdown();
                        await loadCategories();
                        categorySelect.value = apiCat;
                    } else {
                        throw new Error('Category API rejected creation');
                    }
                } catch (catErr) {
                    console.error("Auto-category creation failed, falling back to local DOM append", catErr);
                    const newOption = document.createElement('option');
                    newOption.value = apiCat;
                    newOption.text = apiCat;
                    categorySelect.appendChild(newOption);
                    categorySelect.value = apiCat;
                }
            }
        }

        // Auto-fill Cover Image
        if (bookDetails.imageLinks && bookDetails.imageLinks.thumbnail) {
            // Upgrade to https and remove zoom for better quality (Open Library links don't have this, so we check)
            let hdUrl = bookDetails.imageLinks.thumbnail;
            if (hdUrl.includes('googleapis')) {
                hdUrl = hdUrl.replace('http:', 'https:').replace('&zoom=1', '&zoom=0');
            }
            coverImg.src = hdUrl;
            coverImg.style.display = 'block';
            coverPlaceholder.style.display = 'none';
            hiddenUrlInput.value = hdUrl;
        } else {
            resetCoverPreview();
        }

        // Highlight inputs to show auto-fill success
        [titleInput, authorInput, categorySelect].forEach(el => {
            el.style.borderColor = 'var(--success)';
            setTimeout(() => { el.style.borderColor = ''; }, 1500);
        });

        return "SUCCESS";

    } catch (err) {
        console.error("Error fetching book details:", err);
        if (!silent) alert("Failed to connect to book databases. Please input manually.");
        return "ERROR";
    } finally {
        fetchBtn.innerHTML = originalBtnText;
        fetchBtn.disabled = false;
    }
}

function resetCoverPreview() {
    document.getElementById('coverPreviewImg').style.display = 'none';
    document.getElementById('coverPlaceholderText').style.display = 'block';
    document.getElementById('bookImageUrl').value = '';
}

function updateManualCover() {
    const url = document.getElementById('bookImageUrl').value.trim();
    const coverImg = document.getElementById('coverPreviewImg');
    const coverPlaceholder = document.getElementById('coverPlaceholderText');

    if (url) {
        coverImg.src = url;
        coverImg.style.display = 'block';
        coverPlaceholder.style.display = 'none';

        // Add basic error handling for broken manual links
        coverImg.onerror = function () {
            coverImg.style.display = 'none';
            coverPlaceholder.style.display = 'block';
            coverPlaceholder.innerText = 'Invalid Image URL';
        };
        coverImg.onload = function () {
            coverPlaceholder.innerText = 'No Cover'; // reset error state
        }
    } else {
        coverImg.style.display = 'none';
        coverPlaceholder.style.display = 'block';
        coverPlaceholder.innerText = 'No Cover';
    }
}

// ---------------- REQUESTS ----------------
async function loadRequests(silent = false, searchQuery = '') {
    const tbody = document.querySelector('#requestsTable tbody');
    if (!silent) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';
    }

    try {
        let url = `${API_URL}/requests`;
        if (searchQuery) {
            url += `?search=${encodeURIComponent(searchQuery)}`;
        }
        const res = await fetch(url, { headers: getHeaders() });
        const data = await res.json();

        requestsLoaded = true;

        tbody.innerHTML = ''; // Clear loading text

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No requests found.</td></tr>';
            return;
        }

        data.forEach(req => {
            let actions = '';

            if (req.status === 'Requested') {
                actions = `
                    <button class="btn btn-success" style="background:var(--success); padding: 5px 10px;" onclick="updateStatus('${req._id}', 'Approved')">Approve</button>
                    <button class="btn btn-danger" style="padding: 5px 10px;" onclick="updateStatus('${req._id}', 'Rejected')">Reject</button>
                `;
            } else if (req.status === 'Approved') {
                actions = `
                    <button class="btn btn-primary" style="padding: 5px 10px;" onclick="issueBook('${req._id}')">Issue</button>
                    <button class="btn btn-danger" style="padding: 5px 10px;" onclick="updateStatus('${req._id}', 'Rejected')">Cancel</button>
                `;
            } else if (req.status === 'Issued' || req.status === 'Overdue') {
                actions = `
                    <span style="background: rgba(255,193,7,0.2); color: var(--warning); padding: 5px 10px; border-radius: 4px; font-size: 0.85rem; border: 1px solid rgba(255,193,7,0.3);">
                        <span style="font-size:1rem; vertical-align:middle;">📷</span> Awaiting Scan
                    </span>
                `;
            } else {
                actions = '-';
            }

            const row = `<tr>
                <td>${req.userId ? req.userId.name : 'Unknown'}</td>
                <td>${req.bookId ? req.bookId.title : 'Deleted'}</td>
                <td class="status-${req.status}">${req.status}</td>
                <td>${req.issueDate ? new Date(req.issueDate).toLocaleDateString() : '-'}</td>
                <td>${req.dueDate ? new Date(req.dueDate).toLocaleDateString() : '-'}</td>
                <td>${actions}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    } catch (err) { console.error(err); }
}

async function updateStatus(id, status, days = 7, otp = null) {
    try {
        const payload = { status, days };
        if (otp) payload.otp = otp;

        const res = await fetch(`${API_URL}/requests/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            requestsLoaded = false;
            analyticsLoaded = false; // Analytics might change based on status
            booksLoaded = false; // Stock might have changed (Issued/Returned)
            loadRequests(true);
            // Also refresh stats implicitly next time
        } else {
            await showCustomAlert('Status Update Failed', data.message || 'Error updating status', false);
        }
    } catch (err) {
        console.error(err);
        await showCustomAlert('Error', 'A network error occurred while updating status.', false);
    }
}

// Intentionally removed legacy Total Books Modal logic

async function issueBook(id) {
    const otp = await showCustomPrompt("Verify Member OTP", "Enter the 6-digit OTP code provided by the Member:", "");
    if (!otp) return; // Cancelled

    const days = await showCustomPrompt("Issue Book", "Enter due days:", "7");
    if (days) {
        updateStatus(id, 'Issued', parseInt(days), otp);
    }
}

// Called when clicking the Total Books stat card
function focusBookDirectory() {
    // Switch to books section
    showSection('booksSection');

    // Give the DOM a tiny moment to render the hidden section
    setTimeout(() => {
        // Scroll exactly to the inline search bar / badge area
        const target = document.getElementById('inlineSearchInput');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus();
        }
    }, 50);
}

// ---------------- RETURN SCANNER ----------------
let html5QrcodeScanner = null;
let scannerMode = 'return'; // 'return' or 'add'

async function startScanner(mode = 'return') {
    scannerMode = mode;
    document.getElementById('scannerModal').classList.remove('hidden');

    // Destroy previous instance completely before attempting multi-launch
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.clear();
        } catch (err) {
            console.error("Scanner Error:", err);
            showCustomAlert("Camera Error", "Could not access the camera. Please ensure permissions are granted.", false);
        }
        html5QrcodeScanner = null;
        const readerEl = document.getElementById('reader');
        if (readerEl) readerEl.innerHTML = '';
    }

    html5QrcodeScanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0
    });
    html5QrcodeScanner.render(onScanSuccess);
}

async function stopScanner() {
    document.getElementById('scannerModal').classList.add('hidden');
    if (html5QrcodeScanner) {
        try {
            // Forcefully timeout after 500ms to unfreeze UI if camera lock is deadlocked by Brave
            await Promise.race([
                html5QrcodeScanner.clear(),
                new Promise(resolve => setTimeout(resolve, 500))
            ]);
        } catch (err) {
            console.error("Failed to clear scanner", err);
        }
        html5QrcodeScanner = null;
        const readerEl = document.getElementById('reader');
        if (readerEl) readerEl.innerHTML = '';
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    try {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.pause(true);
        }
        stopScanner();
    } catch (e) {
        console.warn("Could not pause scanner natively, proceeding manually...", e);
    }

    if (scannerMode === 'add') {
        const scanInput = document.getElementById('scanIsbn');
        if (scanInput) {
            scanInput.value = decodedText;
            document.getElementById('fetchBtn').click();
        }
        return;
    }

    // Default 'return' mode logic
    try {
        const res = await fetch(`${API_URL}/requests/return/isbn`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ isbn: decodedText })
        });
        const data = await res.json();

        if (res.ok) {
            let successMessage = `Physical book matched and returned to inventory.`;
            if (data.request && data.request.fineAmount && data.request.fineAmount > 0) {
                const currency = window.tenantCurrency || '₹';
                successMessage += `<br><br><span style="color:var(--danger); font-weight:bold;">⚠️ LATE RETURN: Member owes ${currency}${data.request.fineAmount} in overdue fines. Please collect.</span>`;
            }
            await showCustomAlert('Return Successful!', successMessage, true);
            requestsLoaded = false;
            booksLoaded = false;
            analyticsLoaded = false;
            loadRequests(true);
        } else {
            await showCustomAlert('Scan Failed', data.message || 'Error processing scanned ISBN.', false);
        }
    } catch (err) {
        console.error(err);
        await showCustomAlert('Error', 'A network error occurred while returning the scanned book.', false);
    }
}

// Manual Image File Fallback
const barcodeUpload = document.getElementById('barcodeUpload');
if (barcodeUpload) {
    barcodeUpload.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            try {
                // Instantly swap to a temporary reader instance safely if needed
                const html5QrCode = new Html5Qrcode("reader");
                const decodedText = await html5QrCode.scanFile(e.target.files[0], true);
                e.target.value = ''; // Reset input
                onScanSuccess(decodedText, null); // Simulate native camera success
            } catch (err) {
                console.error("Barcode Image Error:", err);
                alert("Could not detect a valid ISBN Barcode in that image. Try a clearer photo.");
                e.target.value = ''; // Reset input
            }
        }
    });
}

// Initial Load
loadAnalytics();
loadRequests();
loadCategoriesDropdown();

// Real-Time WebSocket Sync
const socket = io(SOCKET_URL);

// When a member requests a new book
socket.on('new_request', () => {
    // Silently refresh requests tab
    if (!document.getElementById('requestsSection').classList.contains('hidden')) {
        loadRequests(true);
    }
    // Silently refresh overview stats
    if (!document.getElementById('overviewSection').classList.contains('hidden')) {
        loadAnalytics();
    }
});

// When another librarian modifies a request (Approves/Rejects/Issues/Returns)
socket.on('status_update', () => {
    if (!document.getElementById('requestsSection').classList.contains('hidden')) {
        loadRequests(true);
    } else {
        requestsLoaded = false;
    }

    if (!document.getElementById('overviewSection').classList.contains('hidden')) {
        loadAnalytics();
    } else {
        analyticsLoaded = false;
    }

    // Update live stock counts if a book was just issued or returned
    if (!document.getElementById('booksSection').classList.contains('hidden')) {
        const inlineSearch = document.getElementById('searchBookInput');
        if (!inlineSearch || inlineSearch.value.trim() === '') {
            loadBooks('', true);
        }
    } else {
        booksLoaded = false;
    }
});

// Fallback File Upload for Brave/Strict Browsers
document.addEventListener('DOMContentLoaded', () => {
    const barcodeUpload = document.getElementById('barcodeUpload');
    if (barcodeUpload) {
        barcodeUpload.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];

            // Provide visual feedback inside the black scanner box
            const readerEl = document.getElementById('reader');
            if (readerEl) readerEl.innerHTML = '<div style="padding: 2rem; color: white; display: flex; justify-content: center; align-items: center; height: 100%;">Analyzing image...</div>';

            const html5QrCode = new Html5Qrcode("reader");
            try {
                const decodedText = await html5QrCode.scanFile(file, true);
                html5QrCode.clear();
                // Pass the successfully extracted text through the standard pipeline
                onScanSuccess(decodedText, null);
                barcodeUpload.value = ''; // Reset
            } catch (err) {
                console.error("File scan error", err);
                html5QrCode.clear();
                barcodeUpload.value = ''; // Reset
                showCustomAlert("Scan Failed", "Could not detect a clear barcode in the image. Please try a different photo with better lighting.", false);
                if (readerEl) readerEl.innerHTML = '';
            }
        });
    }
});

// --- SaaS Phase 5: Bulk Data Import (CSV) ---
async function processCsvImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset input so the same file could be selected again if needed
    document.getElementById('csvFileInput').value = '';

    const proceed = await showCustomConfirm(
        "Confirm Bulk Import",
        `You have selected <b>${file.name}</b>. The system will scan this file for all valid ISBN barcodes and automatically import them into your library.<br><br>This may take several minutes depending on the file size. Do you wish to proceed?`
    );

    if (!proceed) return;

    // Open Progress Modal
    const progressModal = document.getElementById('progressModal');
    const progressMessage = document.getElementById('progressModalMessage');
    const progressCount = document.getElementById('progressModalCount');
    const progressBarFill = document.getElementById('progressBarFill');

    progressModal.classList.remove('hidden');
    progressMessage.textContent = "Analyzing CSV/Text file...";
    progressBarFill.style.width = "0%";
    progressCount.textContent = "0 / 0";

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;

        // Strip hyphens to reconstruct hyphenated ISBNs like 978-1-78633-089-5 -> 9781786330895
        const sanitizedText = text.replace(/[-]/g, '');

        // Robust Regex: Find any distinct number that is 10 to 13 digits long anywhere in the file.
        const matches = sanitizedText.match(/\b\d{10,13}\b/g) || [];

        // Filter out strict 10 or 13 length (real ISBNs), and remove duplicates
        const uniqueIsbns = [...new Set(matches.filter(m => m.length === 10 || m.length === 13))];

        if (uniqueIsbns.length === 0) {
            progressModal.classList.add('hidden');
            showCustomAlert("Import Failed", "No valid ISBN-10 or ISBN-13 numbers were detected in this file.", false);
            return;
        }

        progressMessage.textContent = "Connecting to Global Database...";
        let successCount = 0;
        let failCount = 0;
        let failedIsbns = [];

        for (let i = 0; i < uniqueIsbns.length; i++) {
            const currentIsbn = uniqueIsbns[i];

            // Update UI
            progressMessage.innerHTML = `Fetching metadata for ISBN:<br><b>${currentIsbn}</b>`;
            progressCount.textContent = `${i + 1} / ${uniqueIsbns.length}`;
            progressBarFill.style.width = `${((i + 1) / uniqueIsbns.length) * 100}%`;

            // We must temporarily populate the standard input box because fetchBookDetails reads from it
            document.getElementById('scanIsbn').value = currentIsbn;

            try {
                // Call smart fetcher in SILENT mode. No DOM alerts, no confirmations.
                const fetchStatus = await fetchBookDetails(true);

                if (fetchStatus === "DUPLICATE_INCREMENTED") {
                    // Handled internally by fetchBookDetails
                    successCount++;
                } else if (fetchStatus === "SUCCESS") {
                    const title = document.getElementById('bookTitle').value;
                    if (title && title !== "Book Not Found") {
                        // Directly POST to API instead of manipulating the DOM submit event (Avoids race conditions)
                        const book = {
                            title: title,
                            author: document.getElementById('bookAuthor').value,
                            category: document.getElementById('bookCategory').value,
                            stock: document.getElementById('bookStock').value || 1,
                            isbn: currentIsbn,
                            imageUrl: document.getElementById('bookImageUrl').value
                        };

                        const res = await fetch(`${API_URL}/books`, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify(book)
                        });

                        if (res.ok) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    } else {
                        failCount++;
                        failedIsbns.push(currentIsbn);
                    }
                } else {
                    failCount++; // Hit if NOT_FOUND, NO_ISBN, or ERROR
                    failedIsbns.push(currentIsbn);
                }

                // Wait briefly to not hammer the server too fast
                await new Promise(r => setTimeout(r, 600));

            } catch (err) {
                console.error("Failed importing ISBN " + currentIsbn, err);
                failCount++;
                failedIsbns.push(currentIsbn);
            }
        }

        // Complete!
        progressModal.classList.add('hidden');

        // Clean up input
        document.getElementById('scanIsbn').value = '';
        document.getElementById('addBookForm').reset();

        let summaryMsg = `Bulk Import Complete!<br><br><span style="color:var(--success)">${successCount} Books Imported/Updated</span><br><span style="color:var(--danger)">${failCount} Books Failed (Not Found)</span>`;

        if (failedIsbns.length > 0) {
            summaryMsg += `<br><br><span style="font-size:0.85em; color:var(--text-muted)">An error report containing the failed ISBNs has been downloaded automatically.</span>`;

            // Auto-Generate and Download Error CSV
            const csvContent = "Failed_ISBN\\n" + failedIsbns.join("\\n");
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Bulk_Import_Failures_${new Date().getTime()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }

        await showCustomAlert("Import Summary", summaryMsg, true);

        loadBooks();
    };

    reader.readAsText(file);
}

// ---------------- CONFIGURATION SETTINGS ----------------
async function fetchCurrentConfig() {
    try {
        const subdomain = localStorage.getItem('subdomain') || 'default';
        const res = await fetch(`${API_URL}/tenant/info`, { headers: { 'x-tenant-subdomain': subdomain } });
        if (res.ok) {
            const data = await res.json();
            if (data.fineConfig) {
                document.getElementById('configCurrency').value = data.fineConfig.currency || '₹';
                document.getElementById('configFinePerDay').value = data.fineConfig.finePerDay || 10;
            }
        }
    } catch (err) {
        console.error('Failed to load current configuration', err);
    }
}

const configForm = document.getElementById('configForm');
if (configForm) {
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currency = document.getElementById('configCurrency').value.trim();
        const finePerDay = parseInt(document.getElementById('configFinePerDay').value);
        
        try {
            const res = await fetch(`${API_URL}/tenant/config`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    fineConfig: { currency, finePerDay }
                })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                document.getElementById('configModal').classList.add('hidden');
                
                // Refresh local session variables
                window.tenantCurrency = currency;
                
                // Visually hot-reload active numbers
                if (analyticsLoaded) loadAnalytics();
                
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('Settings Saved', 'Branch configuration updated successfully.', true);
                } else {
                    alert('Settings Saved');
                }
            } else {
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('Error', data.message, false);
                } else alert(data.message);
            }
        } catch(err) {
            console.error(err);
        }
    });
}
