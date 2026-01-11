import axios from 'axios';
import * as samlify from 'samlify';
import type { Config } from '../config.js';

export async function createIdentityProvider(config: Config): Promise<samlify.IdentityProviderInstance> {
  // Fetch metadata from URL
  if (config.idp.metadataUrl) {
    console.log(`Fetching IdP metadata from: ${config.idp.metadataUrl}`);
    try {
      const response = await axios.get(config.idp.metadataUrl, {
        timeout: 10000,
        headers: { Accept: 'application/xml' },
      });
      return samlify.IdentityProvider({
        metadata: response.data,
        // Override to allow unsigned AuthnRequests (for testing/development)
        wantAuthnRequestsSigned: false,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch IdP metadata: ${error.message}`);
      }
      throw error;
    }
  }

  // Manual configuration
  if (config.idp.entityId && config.idp.ssoUrl) {
    if (!config.idp.certificate) {
      throw new Error('IdP certificate is required for manual configuration');
    }

    return samlify.IdentityProvider({
      entityID: config.idp.entityId,
      singleSignOnService: [
        {
          Binding: samlify.Constants.BindingNamespace.Redirect,
          Location: config.idp.ssoUrl,
        },
        {
          Binding: samlify.Constants.BindingNamespace.Post,
          Location: config.idp.ssoUrl,
        },
      ],
      signingCert: config.idp.certificate,
    });
  }

  throw new Error('IdP configuration required: set IDP_METADATA_URL or IDP_ENTITY_ID + IDP_SSO_URL + IDP_CERTIFICATE');
}

export interface IdpInfo {
  entityId: string;
  ssoUrl: string;
  certificate?: string;
}

export function extractIdpInfo(idp: samlify.IdentityProviderInstance): IdpInfo {
  const meta = idp.entityMeta;
  const cert = meta.getX509Certificate(samlify.Constants.wording.certUse.signing);
  const ssoService = meta.getSingleSignOnService(samlify.Constants.BindingNamespace.Redirect);
  return {
    entityId: meta.getEntityID(),
    ssoUrl: typeof ssoService === 'string' ? ssoService : '',
    certificate: typeof cert === 'string' ? cert : undefined,
  };
}
