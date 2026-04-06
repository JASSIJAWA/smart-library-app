const Book = require('../models/Book');
const Request = require('../models/Request');

// @desc    Get all books
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res) => {
    try {
        console.log("QUERY RECEIVED:", req.query);
        let query = { tenantId: req.tenant._id };

        // Add Universal Search Logic
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i'); // case-insensitive regex
            query.$or = [
                { title: searchRegex },
                { author: searchRegex },
                { category: searchRegex }
            ];
        }

        if (req.query.isbn && req.query.isbn.trim() !== '') {
            query.isbn = req.query.isbn.trim();
        }

        const books = await Book.find(query).sort({ createdAt: -1 });

        // Augment out-of-stock books with the closest Due Date
        const augmentedBooks = await Promise.all(books.map(async (bookDoc) => {
            const book = bookDoc.toObject();
            if (book.stock <= 0) {
                // Find the earliest due date among active Issued requests for this specific book
                const activeRequests = await Request.find({
                    bookId: book._id,
                    tenantId: req.tenant._id,
                    status: 'Issued'
                })
                    .sort({ dueDate: 1 })
                    .limit(1)
                    .select('dueDate'); // Only grab due date for security/privacy

                if (activeRequests.length > 0 && activeRequests[0].dueDate) {
                    book.expectedReturn = activeRequests[0].dueDate;
                }
            }
            return book;
        }));

        res.status(200).json(augmentedBooks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
const getBookById = async (req, res) => {
    try {
        const book = await Book.findOne({ _id: req.params.id, tenantId: req.tenant._id });

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.status(200).json(book);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a book
// @route   POST /api/books
// @access  Private (Librarian)
const createBook = async (req, res) => {
    const { title, author, category, stock, isbn, imageUrl } = req.body;

    if (!title || !author || !category || !stock) {
        return res.status(400).json({ message: 'Please add all required fields' });
    }

    try {
        const book = await Book.create({
            tenantId: req.tenant._id,
            title,
            author,
            category,
            stock,
            isbn,
            imageUrl
        });
        res.status(201).json(book);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a book
// @route   PUT /api/books/:id
// @access  Private (Librarian)
const updateBook = async (req, res) => {
    try {
        const book = await Book.findOne({ _id: req.params.id, tenantId: req.tenant._id });

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const updatedBook = await Book.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant._id },
            req.body,
            { new: true }
        );

        res.status(200).json(updatedBook);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Private (Librarian)
const deleteBook = async (req, res) => {
    try {
        const book = await Book.findOne({ _id: req.params.id, tenantId: req.tenant._id });

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        await book.deleteOne();
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk Import books via ISBN array
// @route   POST /api/books/bulk
// @access  Private (Librarian)
const bulkImportBooks = async (req, res) => {
    const { isbns } = req.body;
    if (!isbns || !Array.isArray(isbns) || isbns.length === 0) {
        return res.status(400).json({ message: 'Please provide an array of ISBNs' });
    }

    let successCount = 0;
    let failCount = 0;
    let failedIsbns = [];

    // Simple concurrency limiting (process 5 at a time)
    const BATCH_SIZE = 5;
    for (let i = 0; i < isbns.length; i += BATCH_SIZE) {
        const batch = isbns.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (isbn) => {
            try {
                // Check if book exists
                const existingBook = await Book.findOne({ isbn: isbn, tenantId: req.tenant._id });
                if (existingBook) {
                    existingBook.stock += 1;
                    await existingBook.save();
                    successCount++;
                    return;
                }

                // Fetch from Google Books
                let response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
                let data = await response.json();
                let bookDetails = null;

                if (data.totalItems > 0) {
                    bookDetails = data.items[0].volumeInfo;
                } else {
                    response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${isbn}`);
                    data = await response.json();
                    if (data.totalItems > 0) {
                        bookDetails = data.items[0].volumeInfo;
                    } else {
                        // Fallback open library
                        const olResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
                        const olData = await olResponse.json();
                        const olKey = `ISBN:${isbn}`;
                        if (olData[olKey]) {
                            const olBook = olData[olKey];
                            bookDetails = {
                                title: olBook.title,
                                authors: olBook.authors ? olBook.authors.map(a => a.name) : null,
                                categories: olBook.subjects ? olBook.subjects.map(s => s.name) : null,
                                imageLinks: olBook.cover ? { thumbnail: olBook.cover.large || olBook.cover.medium } : null
                            };
                        }
                    }
                }

                if (!bookDetails || !bookDetails.title) {
                    failCount++;
                    failedIsbns.push(isbn);
                    return;
                }

                // Create book
                let hdUrl = '';
                if (bookDetails.imageLinks && bookDetails.imageLinks.thumbnail) {
                    hdUrl = bookDetails.imageLinks.thumbnail;
                    if (hdUrl.includes('googleapis')) {
                        hdUrl = hdUrl.replace('http:', 'https:').replace('&zoom=1', '&zoom=0');
                    }
                }

                await Book.create({
                    tenantId: req.tenant._id,
                    title: bookDetails.title,
                    author: bookDetails.authors && bookDetails.authors.length > 0 ? bookDetails.authors[0] : 'Unknown Author',
                    category: bookDetails.categories && bookDetails.categories.length > 0 ? bookDetails.categories[0] : 'General',
                    stock: 1,
                    isbn: isbn,
                    imageUrl: hdUrl
                });

                successCount++;
            } catch (error) {
                console.error(`Bulk import error for ISBN ${isbn}:`, error);
                failCount++;
                failedIsbns.push(isbn);
            }
        }));
    }

    res.status(200).json({ successCount, failCount, failedIsbns });
};

module.exports = {
    getBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
    bulkImportBooks
};
