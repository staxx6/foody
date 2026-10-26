// Serves the built app over HTTPS in the home network and forwards the API
// to PocketBase, which itself stays reachable from this machine only.
import { existsSync, readFileSync, createReadStream, statSync } from 'node:fs';
import { createServer as createHttpServer, request } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';

const root = join(import.meta.dirname, '..');
const appDir = join(root, 'dist', 'apps', 'foody', 'browser');
const certDir = join(root, 'certs');

const HTTPS_PORT = Number(process.env.FOODY_HTTPS_PORT ?? 8443);
// Plain HTTP only hands out the certificate the phone has to trust
const HTTP_PORT = Number(process.env.FOODY_HTTP_PORT ?? 8880);
const POCKETBASE = {
  host: '127.0.0.1',
  port: Number(process.env.FOODY_POCKETBASE_PORT ?? 8090),
};
const CA_FILE = 'foody-ca.crt';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

for (const file of ['foody.pem', 'foody-key.pem', CA_FILE]) {
  if (!existsSync(join(certDir, file))) {
    console.error(`Missing certs/${file}. Run "pnpm run cert" first.`);
    process.exit(1);
  }
}
if (!existsSync(join(appDir, 'index.html'))) {
  console.error('Missing build. Run "pnpm nx build foody" first.');
  process.exit(1);
}

function proxyToPocketBase(req, res) {
  const upstream = request(
    {
      ...POCKETBASE,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        'x-forwarded-for': req.socket.remoteAddress ?? '',
        'x-forwarded-proto': 'https',
      },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('PocketBase is not running');
  });
  req.pipe(upstream);
}

function serveFile(res, file) {
  const isImmutable = /[-.][A-Z0-9]{8}\.(js|css)$/.test(file);
  res.writeHead(200, {
    'content-type': MIME_TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': isImmutable
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

function serveApp(req, res) {
  const path = decodeURIComponent(new URL(req.url, 'https://foody').pathname);
  const file = normalize(join(appDir, path));
  if (!file.startsWith(appDir + sep) && file !== appDir) {
    res.writeHead(403).end();
    return;
  }

  if (existsSync(file) && statSync(file).isFile()) {
    serveFile(res, file);
  } else if (extname(path)) {
    res.writeHead(404).end();
  } else {
    // Routes are handled by the app
    serveFile(res, join(appDir, 'index.html'));
  }
}

const httpsServer = createHttpsServer(
  {
    cert: readFileSync(join(certDir, 'foody.pem')),
    key: readFileSync(join(certDir, 'foody-key.pem')),
  },
  (req, res) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/_/')) {
      proxyToPocketBase(req, res);
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      serveApp(req, res);
    } else {
      res.writeHead(405).end();
    }
  },
);

// A device that does not trust the certificate only sees a network error;
// the reason is only visible here
httpsServer.on('tlsClientError', (error, socket) => {
  const address = socket.remoteAddress?.replace(/^::ffff:/, '') ?? '?';
  if (address === '127.0.0.1' || address === '::1') return;
  console.error(
    `${new Date().toLocaleString()} TLS refused by ${address}: ${error.message}`,
  );
});

const httpServer = createHttpServer((req, res) => {
  if (req.url === `/${CA_FILE}`) {
    res.writeHead(200, {
      'content-type': 'application/x-x509-ca-cert',
      'content-disposition': `attachment; filename="${CA_FILE}"`,
    });
    createReadStream(join(certDir, CA_FILE)).pipe(res);
    return;
  }
  const host = (req.headers.host ?? 'localhost').replace(/:\d+$/, '');
  res.writeHead(302, { location: `https://${host}:${HTTPS_PORT}${req.url}` });
  res.end();
});

for (const [server, port] of [
  [httpsServer, HTTPS_PORT],
  [httpServer, HTTP_PORT],
]) {
  server.on('error', (error) => {
    console.error(`Cannot listen on port ${port}: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, '0.0.0.0');
}

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((address) => address?.family === 'IPv4' && !address.internal)
  .map((address) => address.address);

console.log(`foody:        https://localhost:${HTTPS_PORT}`);
for (const address of addresses) {
  console.log(`In the network: https://${address}:${HTTPS_PORT}`);
  console.log(`Certificate:    http://${address}:${HTTP_PORT}/${CA_FILE}`);
}
