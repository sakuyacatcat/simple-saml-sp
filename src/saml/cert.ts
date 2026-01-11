import forge from 'node-forge';

export interface KeyPair {
  privateKey: string;
  certificate: string;
}

export function generateSelfSignedCert(): KeyPair {
  // Generate RSA key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Create certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';

  // Valid for 1 year
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  // Set subject and issuer
  const attrs = [
    { name: 'commonName', value: 'Simple SAML SP' },
    { name: 'organizationName', value: 'Test Organization' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Self-sign
  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
    certificate: forge.pki.certificateToPem(cert),
  };
}
