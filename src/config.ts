import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import 'dotenv/config';

export interface Config {
  sp: {
    entityId: string;
  };
  idp: {
    metadataUrl?: string;
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
  };
  server: {
    port: number;
    baseUrl: string;
    sessionSecret: string;
  };
  debug: {
    enabled: boolean;
    logSamlMessages: boolean;
  };
}

interface YamlConfig {
  sp?: {
    entityId?: string;
  };
  idp?: {
    metadataUrl?: string;
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
  };
  server?: {
    port?: number;
    baseUrl?: string;
    sessionSecret?: string;
  };
  debug?: {
    enabled?: boolean;
    logSamlMessages?: boolean;
  };
}

function loadYamlConfig(): YamlConfig {
  const configPath = path.join(process.cwd(), 'config.yaml');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    return yaml.load(content) as YamlConfig || {};
  }
  return {};
}

export function loadConfig(): Config {
  const yamlConfig = loadYamlConfig();

  const port = parseInt(process.env.PORT || '', 10) || yamlConfig.server?.port || 3000;
  const baseUrl = process.env.BASE_URL || yamlConfig.server?.baseUrl || `http://localhost:${port}`;

  return {
    sp: {
      entityId: process.env.SP_ENTITY_ID || yamlConfig.sp?.entityId || `${baseUrl}/metadata`,
    },
    idp: {
      metadataUrl: process.env.IDP_METADATA_URL || yamlConfig.idp?.metadataUrl,
      entityId: process.env.IDP_ENTITY_ID || yamlConfig.idp?.entityId,
      ssoUrl: process.env.IDP_SSO_URL || yamlConfig.idp?.ssoUrl,
      certificate: process.env.IDP_CERTIFICATE || yamlConfig.idp?.certificate,
    },
    server: {
      port,
      baseUrl,
      sessionSecret: process.env.SESSION_SECRET || yamlConfig.server?.sessionSecret || 'dev-secret-change-me',
    },
    debug: {
      enabled: process.env.DEBUG === 'true' || yamlConfig.debug?.enabled || false,
      logSamlMessages: process.env.DEBUG_SAML === 'true' || yamlConfig.debug?.logSamlMessages || false,
    },
  };
}
