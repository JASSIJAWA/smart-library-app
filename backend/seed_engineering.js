const mongoose = require('mongoose');
const https = require('https');
const Book = require('./models/Book');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/library', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected for Seeding...')).catch(err => console.log(err));

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', err => reject(err));
    });
}

async function seedEngineeringBooks() {
    let addedCount = 0;
    let startIndex = 0;

    console.log("Starting to fetch engineering books from Google Books API...");

    while (addedCount < 100) {
        try {
            const data = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=subject:engineering&maxResults=40&startIndex=${startIndex}`);

            if (!data.items || data.items.length === 0) break;

            for (let item of data.items) {
                if (addedCount >= 100) break;

                const info = item.volumeInfo;
                if (!info.title || !info.authors) continue;

                let isbn = '';
                if (info.industryIdentifiers) {
                    const isbn13 = info.industryIdentifiers.find(id => id.type === 'ISBN_13');
                    const isbn10 = info.industryIdentifiers.find(id => id.type === 'ISBN_10');
                    isbn = isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : '');
                }
                if (!isbn) continue;

                const existing = await Book.findOne({ isbn });
                if (existing) continue;

                let imageUrl = '';
                if (info.imageLinks && info.imageLinks.thumbnail) {
                    imageUrl = info.imageLinks.thumbnail.replace('http:', 'https:').replace('&zoom=1', '&zoom=0');
                }

                const category = (info.categories && info.categories.length > 0) ? info.categories[0] : 'Engineering';

                const stock = Math.floor(Math.random() * 10) + 1;

                await Book.create({
                    title: info.title,
                    author: info.authors[0],
                    category: category,
                    stock: stock,
                    isbn: isbn,
                    imageUrl: imageUrl
                });

                addedCount++;
                console.log(`[${addedCount}/100] Added: ${info.title} (ISBN: ${isbn})`);
            }
            startIndex += 40;
        } catch (e) {
            console.error("Error fetching or saving:", e);
            break;
        }
    }

    console.log(`\n✅ Database seeding complete! Successfully added ${addedCount} engineering books.`);
    process.exit(0);
}

seedEngineeringBooks();
