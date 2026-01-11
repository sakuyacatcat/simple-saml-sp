import * as fs from 'fs';
import * as path from 'path';

export interface KeyPair {
  privateKey: string;
  certificate: string;
}

/**
 * Load certificate and private key from files.
 * Throws an error with helpful instructions if files are not found.
 */
export function loadCertificateFromFiles(keyFile: string, certFile: string): KeyPair {
  const keyPath = path.resolve(process.cwd(), keyFile);
  const certPath = path.resolve(process.cwd(), certFile);

  // Check if private key exists
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `SP private key not found: ${keyPath}\n\n` +
      `Please create a self-signed certificate with the following command:\n\n` +
      `  mkdir -p certs\n` +
      `  openssl req -x509 -newkey rsa:2048 \\\n` +
      `    -keyout ${keyFile} \\\n` +
      `    -out ${certFile} \\\n` +
      `    -days 365 -nodes \\\n` +
      `    -subj "/CN=Simple SAML SP/O=Test Organization"\n\n` +
      `Then restart the application.`
    );
  }

  // Check if certificate exists
  if (!fs.existsSync(certPath)) {
    throw new Error(
      `SP certificate not found: ${certPath}\n\n` +
      `Please create a self-signed certificate with the following command:\n\n` +
      `  mkdir -p certs\n` +
      `  openssl req -x509 -newkey rsa:2048 \\\n` +
      `    -keyout ${keyFile} \\\n` +
      `    -out ${certFile} \\\n` +
      `    -days 365 -nodes \\\n` +
      `    -subj "/CN=Simple SAML SP/O=Test Organization"\n\n` +
      `Then restart the application.`
    );
  }

  console.log(`Loading SP certificate from: ${keyFile}, ${certFile}`);

  return {
    privateKey: fs.readFileSync(keyPath, 'utf-8'),
    certificate: fs.readFileSync(certPath, 'utf-8'),
  };
}
