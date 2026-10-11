// Creates the HTTPS certificate for the home network with mkcert.
// Run again when the address of this machine in the network changes.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { hostname, networkInterfaces } from 'node:os';
import { join } from 'node:path';

const certDir = join(import.meta.dirname, '..', 'certs');

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter(
    (address) =>
      address?.family === 'IPv4' &&
      !address.internal &&
      !address.address.startsWith('169.254.'),
  )
  .map((address) => address.address);
const host = hostname().toLowerCase();
const names = ['localhost', '127.0.0.1', host, `${host}.local`, ...addresses];

mkdirSync(certDir, { recursive: true });
execFileSync(
  'mkcert',
  [
    '-cert-file',
    join(certDir, 'foody.pem'),
    '-key-file',
    join(certDir, 'foody-key.pem'),
    ...names,
  ],
  { stdio: 'inherit' },
);

// The public certificate of the local authority, to be installed on the phone
const caRoot = execFileSync('mkcert', ['-CAROOT'], { encoding: 'utf8' }).trim();
copyFileSync(join(caRoot, 'rootCA.pem'), join(certDir, 'foody-ca.crt'));

console.log(`\nCertificate valid for: ${names.join(', ')}`);
