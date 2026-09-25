const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aif': 'audio/aiff',
    '.aiff': 'audio/aiff',
    '.m4a': 'audio/mp4'
};

const { generateSamplesManifest } = require('./generate-samples');
try {
    generateSamplesManifest();
} catch (e) {
    console.warn('Предупреждение при генерации манифеста сэмплов:', e.message);
}

const handleRequest = (req, res) => {
    const rawUrl = req.url.split('?')[0];

    // API: Загрузка сэмпла в конкретную папку на сервере
    if (req.method === 'POST' && rawUrl === '/api/upload-sample') {
        const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const folder = u.searchParams.get('folder') || '';
        const filename = u.searchParams.get('file') || 'sample.wav';
        const cleanFolder = path.basename(folder);
        const cleanFile = path.basename(filename);

        const targetDir = cleanFolder ? path.join(__dirname, 'samples', cleanFolder) : path.join(__dirname, 'samples');
        try {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const targetPath = path.join(targetDir, cleanFile);
            const ws = fs.createWriteStream(targetPath);
            req.pipe(ws);
            ws.on('finish', () => {
                const relUrl = cleanFolder
                    ? `samples/${encodeURIComponent(cleanFolder)}/${encodeURIComponent(cleanFile)}`
                    : `samples/${encodeURIComponent(cleanFile)}`;
                try { generateSamplesManifest(); } catch (e) {}
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, url: relUrl, name: cleanFile }));
            });
            ws.on('error', (err) => {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: err.message }));
            });
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // API: Сканирование папки samples и её подпапок (с автоматической генерацией манифеста)
    if (rawUrl === '/api/samples') {
        try {
            const result = generateSamplesManifest();
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache'
            });
            return res.end(JSON.stringify(result));
        } catch (err) {
            console.error('Ошибка API samples:', err);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    let decodedPath = '';
    try {
        decodedPath = decodeURIComponent(rawUrl);
    } catch (e) {
        decodedPath = rawUrl;
    }

    let relPath = decodedPath.replace(/^\//, '');
    if (!relPath || relPath === '') relPath = 'index.html';
    const filePath = path.join(__dirname, relPath);

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.stat(filePath, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Server Error');
            }
            return;
        }

        const totalSize = stats.size;
        const range = req.headers.range;

        // Поддержка Range-запросов (HTTP 206) для мгновенной перемотки и аудиопотоков
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

            if (start >= totalSize || end >= totalSize) {
                res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
                return res.end();
            }

            const chunkSize = (end - start) + 1;
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType
            });

            const stream = fs.createReadStream(filePath, { start, end });
            stream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': totalSize,
                'Accept-Ranges': 'bytes',
                'Content-Type': contentType
            });
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }
    });
};

const PORTS = [5050, 8080];
PORTS.forEach(port => {
    http.createServer(handleRequest).listen(port, () => {
        console.log(`FRONTEND SERVER IS RUNNING ON http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use.`);
        } else {
            console.error(`Error on port ${port}:`, err.message);
        }
    });
});
