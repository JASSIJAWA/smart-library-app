const mongoose = require('mongoose');
const https = require('https');
require('dotenv').config();
const connectDB = require('./config/db');
const Book = require('./models/Book');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', err => reject(err));
    });
}

async function seedEngineeringBooks() {
    await connectDB();

    let addedCount = 0;
    let queries = ['mechanical engineering', 'civil engineering', 'electrical engineering', 'artificial intelligence', 'machine learning', 'data structures', 'thermodynamics'];

    console.log("Starting to fetch engineering books...");

    for (let q of queries) {
        if (addedCount >= 106) break;
        let startIndex = 0;
        while (startIndex < 40 && addedCount < 106) {
            try {
                const data = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=40&startIndex=${startIndex}`);
                if (!data.items || data.items.length === 0) break;

                for (let item of data.items) {
                    if (addedCount >= 106) break;

                    const info = item.volumeInfo;
                    if (!info.title || !info.authors) continue;

                    let isbn = '';
                    if (info.industryIdentifiers) {
                        const iId = info.industryIdentifiers.find(id => id.type.includes('ISBN'));
                        if (iId) isbn = iId.identifier;
                    }
                    if (!isbn) {
                        isbn = '978100' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
                    }

                    const existing = await Book.findOne({ isbn });
                    if (existing) continue;

                    let imageUrl = '';
                    if (info.imageLinks && info.imageLinks.thumbnail) {
                        imageUrl = info.imageLinks.thumbnail.replace('http:', 'https:').replace('&zoom=1', '&zoom=0');
                    }

                    const category = (info.categories && info.categories.length > 0) ? info.categories[0] : 'Engineering/Tech';
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
                    console.log(`[${addedCount}/106] Added: ${info.title} (ISBN: ${isbn})`);
                }
                startIndex += 40;
            } catch (e) {
                console.error("Error:", e);
                break;
            }
        }
    }

    console.log(`\n✅ Database seeding complete! Successfully added ${addedCount} engineering books.`);
    process.exit(0);
}

seedEngineeringBooks();
