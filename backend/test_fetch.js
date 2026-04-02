const https = require('https');

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
fetchJson('https://www.googleapis.com/books/v1/volumes?q=subject:engineering&maxResults=40').then(data => console.log('success', data.items.length)).catch(console.error);
