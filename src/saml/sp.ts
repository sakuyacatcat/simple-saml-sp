import * as samlify from 'samlify';
import type { Config } from '../config.js';
import { loadCertificateFromFiles } from './cert.js';

export function createServiceProvider(config: Config): samlify.ServiceProviderInstance {
  // Load certificate from files (throws error with instructions if not found)
  const keyPair = loadCertificateFromFiles(config.sp.keyFile, config.sp.certFile);

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
