import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const port = 5175;

http
  .createServer((req, res) => {
    const pathname = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(root, pathname || '/index.html');
    if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200);
    res.end(fs.readFileSync(filePath));
  })
  .listen(port, () => {
    console.log(`Passenger MVP dev server at http://localhost:${port}`);
  });
