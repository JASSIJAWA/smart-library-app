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

module.exports = {
    getBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
};
