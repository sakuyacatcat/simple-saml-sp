import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as samlify from 'samlify';
import type { Config } from '../config.js';

export async function createIdentityProvider(config: Config): Promise<samlify.IdentityProviderInstance> {
  // Priority 1: Load metadata from local file
  if (config.idp.metadataFile) {
    const metadataPath = path.resolve(process.cwd(), config.idp.metadataFile);
    console.log(`Loading IdP metadata from file: ${metadataPath}`);

    if (!fs.existsSync(metadataPath)) {
      throw new Error(
        `IdP metadata file not found: ${metadataPath}\n\n` +
        `Please download IdP metadata and save it to this location.\n\n` +
        `For Keycloak, run:\n\n` +
        `  mkdir -p metadata\n` +
        `  curl -o ${config.idp.metadataFile} \\\n` +
        `    http://localhost:8080/realms/myrealm/protocol/saml/descriptor\n\n` +
        `Or open the URL in your browser and save the XML content.\n\n` +
        `Then restart the application.`
      );
    }

    const metadata = fs.readFileSync(metadataPath, 'utf-8');
    return samlify.IdentityProvider({
      metadata,
      wantAuthnRequestsSigned: false,
    });
  }

  // Priority 2: Fetch metadata from URL
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

  // Priority 3: Manual configuration
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

  throw new Error(
    'IdP configuration required. Choose one of:\n\n' +
    '  1. Set idp.metadataFile in config.yaml to load from local file\n' +
    '  2. Set IDP_METADATA_URL environment variable to fetch from URL\n' +
    '  3. Set IDP_ENTITY_ID + IDP_SSO_URL + IDP_CERTIFICATE for manual config'
  );
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
