const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8888;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Decode URL-encoded characters (like %20 for spaces)
    let filePath = '.' + decodeURIComponent(req.url);
    if (filePath === './') {
        filePath = './galaxy.html';
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // Stream audio files for better performance
    if (contentType.startsWith('audio/')) {
        try {
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;
            
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(filePath, { start, end });
                
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': contentType
                });
                file.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': contentType
                });
                fs.createReadStream(filePath).pipe(res);
            }
        } catch (error) {
            console.error('Audio file error:', error);
            res.writeHead(404);
            res.end('Audio file not found');
        }
    } else {
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>', 'utf-8');
                } else {
                    res.writeHead(500);
                    res.end('Server Error: ' + error.code, 'utf-8');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                // Handle binary files (audio, images) vs text files
                if (contentType.startsWith('text/') || contentType === 'application/json') {
                    res.end(content, 'utf-8');
                } else {
                    res.end(content);
                }
            }
        });
    }
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});