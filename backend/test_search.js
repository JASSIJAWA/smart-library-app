const http = require('http');

http.get('http://localhost:5000/api/books?search=Pragmatic', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(JSON.parse(data).slice(0, 3))); // Log only top 3 to keep terminal clean
}).on('error', err => console.log(err.message));
