import * as samlify from 'samlify';
import type { Config } from '../config.js';
import { generateSelfSignedCert } from './cert.js';

// Generate a key pair for signing (cached for the session)
let cachedKeyPair: { privateKey: string; certificate: string } | null = null;

function getKeyPair() {
  if (!cachedKeyPair) {
    console.log('Generating self-signed certificate for SP...');
    cachedKeyPair = generateSelfSignedCert();
  }
  return cachedKeyPair;
}

export function createServiceProvider(config: Config): samlify.ServiceProviderInstance {
  const keyPair = getKeyPair();

  return samlify.ServiceProvider({
    entityID: config.sp.entityId,
    assertionConsumerService: [
      {
        Binding: samlify.Constants.BindingNamespace.Post,
        Location: `${config.server.baseUrl}/acs`,
      },
    ],
    singleLogoutService: [
      {
        Binding: samlify.Constants.BindingNamespace.Redirect,
        Location: `${config.server.baseUrl}/slo`,
      },
    ],
    // Enable signed requests
    authnRequestsSigned: true,
    wantAssertionsSigned: true,
    // Signing credentials
    privateKey: keyPair.privateKey,
    signingCert: keyPair.certificate,
  });
}
