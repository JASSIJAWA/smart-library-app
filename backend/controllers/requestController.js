const Request = require('../models/Request');
const Book = require('../models/Book');
const { io } = require('../server');

// @desc    Create a new request
// @route   POST /api/requests
// @access  Private (Member)
const createRequest = async (req, res) => {
    const { bookId } = req.body;

    if (!bookId) {
        return res.status(400).json({ message: 'Please provide a book ID' });
    }

    try {
        const book = await Book.findOne({ _id: bookId, tenantId: req.tenant._id });
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Calculate dynamic availability (Physical minus Reserved queue)
        const reservedStock = await Request.countDocuments({
            tenantId: req.tenant._id,
            bookId,
            status: { $in: ['Requested', 'Approved'] }
        });
        
        const availableStock = book.stock - reservedStock;

        // Check if user already has a pending request, waitlist, or active issue for this book
        const existingRequest = await Request.findOne({
            tenantId: req.tenant._id,
            userId: req.user.id,
            bookId,
            status: { $in: ['Requested', 'Approved', 'Issued', 'Waitlisted'] },
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You already have a request, active waitlist, or issue for this book' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Dynamically route based on exact mathematical availability
        const designatedStatus = availableStock > 0 ? 'Requested' : 'Waitlisted';

        const request = await Request.create({
            tenantId: req.tenant._id,
            userId: req.user.id,
            bookId,
            status: designatedStatus,
            otp
        });

        // Broadcast to Librarians (and potentially the user if they had multiple tabs)
        if (io) io.emit('new_request');

        // Email Dispatcher Integration
        const nodemailer = require('nodemailer');
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                let emailSubject = '';
                let emailHtml = '';

                if (designatedStatus === 'Requested') {
                    emailSubject = '📚 Library Reservation Confirmed - Security OTP';
                    emailHtml = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; background: #ffffff;">
                            <h2 style="color: #00cc99; margin-top: 0; font-size: 24px;">Reservation Confirmed</h2>
                            <p style="color: #4a5568; font-size: 16px;">Hi <b>${req.user.name}</b>,</p>
                            <p style="color: #4a5568; font-size: 16px;">Your physical copy request for <strong>"${book.title}"</strong> has been successfully placed by the system.</p>
                            <p style="color: #4a5568; font-size: 16px;">To verify your identity upon physical pickup, please present the following 6-digit Security Pin to the Librarian:</p>
                            
                            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e293b; margin: 25px 0; border-radius: 8px; border: 1px dashed #cbd5e1;">
                                ${otp}
                            </div>
                            
                            <p style="color: #718096; font-size: 14px; font-style: italic;">Note: Library personnel will never ask for this code outside of the official scanning desk. Do not share your pin.</p>
                        </div>
                    `;
                } else if (designatedStatus === 'Waitlisted') {
                    emailSubject = '⏳ Library Waitlist Confirmed';
                    emailHtml = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; background: #ffffff;">
                            <h2 style="color: #f59e0b; margin-top: 0; font-size: 24px;">Active Waitlist Reserved</h2>
                            <p style="color: #4a5568; font-size: 16px;">Hi <b>${req.user.name}</b>,</p>
                            <p style="color: #4a5568; font-size: 16px;">You have successfully reserved a virtual queue slot for <strong>"${book.title}"</strong>.</p>
                            <p style="color: #4a5568; font-size: 16px;">The system will continually monitor the physical inventory. The exact moment a copy is scanned back independently, we will automatically upgrade your slot and generate your Security OTP!</p>
                            <br/>
                            <p style="color: #718096; font-size: 14px; font-style: italic;">Check your live Member Dashboard for instantaneous queue updates.</p>
                        </div>
                    `;
                }

                if (emailSubject) {
                    const mailOptions = {
                        from: `"Smart Library Dispatch" <${process.env.EMAIL_USER}>`,
                        to: req.user.email,
                        subject: emailSubject,
                        html: emailHtml
                    };
                    transporter.sendMail(mailOptions)
                        .then(() => console.log(`[Email] Dispatched to ${req.user.email}`))
                        .catch(err => console.error("[Email] Sending failed:", err));
                }
            } catch (mailError) {
                console.error("[Email] Transport configuration error:", mailError);
            }
        }

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all requests
// @route   GET /api/requests
// @access  Private (Member sees own, Librarian sees all)
const getRequests = async (req, res) => {
    try {
        let query = { tenantId: req.tenant._id };
        const search = req.query.search;

        if (search) {
            const regex = new RegExp(search, 'i');

            // Find ALL matching Users or Books within this specific isolated tenant
            const [users, books] = await Promise.all([
                require('../models/User').find({ tenantId: req.tenant._id, $or: [{ name: regex }, { email: regex }] }).select('_id'),
                Book.find({ tenantId: req.tenant._id, $or: [{ title: regex }, { author: regex }] }).select('_id')
            ]);

            const userIds = users.map(u => u._id);
            const bookIds = books.map(b => b._id);

            query.$or = [
                { userId: { $in: userIds } },
                { bookId: { $in: bookIds } }
            ];

            // Also allow direct status search (e.g. typing "Issued")
            if (['Requested', 'Approved', 'Rejected', 'Issued', 'Returned', 'Overdue'].some(s => s.toLowerCase().includes(search.toLowerCase()))) {
                query.$or.push({ status: regex });
            }
        }

        let requests;
        if (req.user.role === 'Librarian') {
            requests = await Request.find(query)
                .sort({ createdAt: -1 })
                .populate('userId', 'name email')
                .populate('bookId', 'title author');
        } else {
            query.userId = req.user.id; // Force Member isolation

            // If they searched and it matched another user, it won't matter because of this explicit AND context in mongoose when merging query logic
            requests = await Request.find(query)
                .sort({ createdAt: -1 })
                .populate('bookId', 'title author');
        }
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update request status
// @route   PUT /api/requests/:id
// @access  Private (Librarian)
const updateRequestStatus = async (req, res) => {
    const { status, days, otp } = req.body; // days for due date, otp for verification
    const { id } = req.params;

    try {
        const request = await Request.findOne({ _id: id, tenantId: req.tenant._id });

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const book = await Book.findById(request.bookId);

        // Workflow Logic
        if (status === 'Approved') {
            if (request.status !== 'Requested') {
                return res.status(400).json({ message: 'Can only approve Requested status' });
            }
        } else if (status === 'Rejected') {
            if (request.status !== 'Requested' && request.status !== 'Approved') {
                return res.status(400).json({ message: 'Can only reject Requested or Approved statuses' });
            }
            
            // If a virtual claim is cancelled, transfer the virtual spot to the next waitlisted user
            const waitlistedReq = await Request.findOne({ tenantId: req.tenant._id, bookId: book._id, status: 'Waitlisted' }).sort({ createdAt: 1 });
            if (waitlistedReq) {
                waitlistedReq.status = 'Approved';
                await waitlistedReq.save();
            }
        } else if (status === 'Issued') {
            if (request.status !== 'Approved' && request.status !== 'Requested') {
                return res.status(400).json({ message: 'Can only issue Approved or Requested books' });
            }
            if (!otp || request.otp !== otp) {
                return res.status(400).json({ message: 'Invalid OTP provided' });
            }
            if (book.stock < 1) {
                return res.status(400).json({ message: 'Book out of stock' });
            }

            request.issueDate = new Date();
            const dueDays = days || 7; // Default 7 days
            request.dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

            // Decrement stock ONLY if it wasn't already decremented
            book.stock -= 1;
            await book.save();

        } else if (status === 'Returned') {
            if (request.status !== 'Issued') {
                return res.status(400).json({ message: 'Can only return Issued books' });
            }

            request.returnDate = new Date();

            // Always gracefully increment physical stock when a book returns to the desk
            book.stock += 1;
            await book.save();

            // WAITLIST AUTO-UPGRADE LOGIC
            const waitlistedReq = await Request.findOne({ tenantId: req.tenant._id, bookId: book._id, status: 'Waitlisted' }).sort({ createdAt: 1 });
            if (waitlistedReq) {
                waitlistedReq.status = 'Approved';
                // The physical stock is now safely protected by the virtual logic
                await waitlistedReq.save();
            }

            // Calculate Fine (Basic logic, will be enhanced in Step 7)
            // If returnDate > dueDate
            const overdueTime = request.returnDate - request.dueDate;
            if (overdueTime > 0) {
                const overdueDays = Math.ceil(overdueTime / (1000 * 60 * 60 * 24));
                const finePerDay = req.tenant.fineConfig?.finePerDay !== undefined ? req.tenant.fineConfig.finePerDay : 10;
                request.fineAmount = overdueDays * finePerDay;
            }

        } else {
            return res.status(400).json({ message: 'Invalid status' });
        }

        request.status = status;
        await request.save();

        // Broadcast the status change to connected clients (Member and Librarians)
        if (io) io.emit('status_update');

        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process a book return via ISBN barcode scan
// @route   POST /api/requests/return/isbn
// @access  Private (Librarian)
const processIsbnReturn = async (req, res) => {
    try {
        const { isbn } = req.body;

        if (!isbn) {
            return res.status(400).json({ message: 'ISBN barcode data is required' });
        }

        // 1. Find the physical book by ISBN
        const book = await Book.findOne({ isbn, tenantId: req.tenant._id });
        if (!book) {
            return res.status(404).json({ message: 'No book found matching this ISBN barcode in the system' });
        }

        // 2. Find the oldest active 'Issued' Request for this specific book model
        const request = await Request.findOne({
            tenantId: req.tenant._id,
            bookId: book._id,
            status: 'Issued'
        }).sort({ issueDate: 1 });

        if (!request) {
            return res.status(400).json({ message: 'This book is not currently issued to any member' });
        }

        // 3. Mark the request as Returned
        request.returnDate = new Date();
        request.status = 'Returned';

        // Always gracefully increment physical stock when a book returns to the desk
        book.stock += 1;
        await book.save();

        // WAITLIST AUTO-UPGRADE LOGIC
        const waitlistedReq = await Request.findOne({ tenantId: req.tenant._id, bookId: book._id, status: 'Waitlisted' }).sort({ createdAt: 1 });
        if (waitlistedReq) {
            waitlistedReq.status = 'Approved';
            // The physical stock is now safely protected by the virtual logic
            await waitlistedReq.save();
        }

        // Calculate Fine (Basic logic)
        const overdueTime = request.returnDate - request.dueDate;
        if (overdueTime > 0) {
            const overdueDays = Math.ceil(overdueTime / (1000 * 60 * 60 * 24));
            const finePerDay = req.tenant.fineConfig?.finePerDay !== undefined ? req.tenant.fineConfig.finePerDay : 10;
            request.fineAmount = overdueDays * finePerDay;
        }

        await request.save();

        // Broadcast the status change to connected UI clients
        if (io) io.emit('status_update');

        res.status(200).json({
            message: 'Book returned successfully via Barcode Scanner',
            request
        });

    } catch (error) {
        console.error('Barcode Return Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createRequest,
    getRequests,
    updateRequestStatus,
    processIsbnReturn,
};
