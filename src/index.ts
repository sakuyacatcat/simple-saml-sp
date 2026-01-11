import express from 'express';
import session from 'express-session';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as samlify from 'samlify';
import { loadConfig } from './config.js';
import { createServiceProvider } from './saml/sp.js';
import { createIdentityProvider, extractIdpInfo } from './saml/idp.js';
import { createRoutes } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set a permissive schema validator for testing/learning purposes
// In production, use @authenio/samlify-xsd-schema-validator with Java
samlify.setSchemaValidator({
  validate: () => Promise.resolve('skipped'),
});

async function main() {
  const config = loadConfig();

  console.log('Starting Simple SAML SP Test Tool...');
  console.log(`  SP Entity ID: ${config.sp.entityId}`);
  console.log(`  Base URL: ${config.server.baseUrl}`);
  console.log(`  Debug mode: ${config.debug.enabled}`);

  // Create SP
  const sp = createServiceProvider(config);

  // Create IdP (fetches metadata)
  const idp = await createIdentityProvider(config);
  const idpInfo = extractIdpInfo(idp);
  console.log(`  IdP Entity ID: ${idpInfo.entityId}`);
  console.log(`  IdP SSO URL: ${idpInfo.ssoUrl}`);

  // Create Express app
  const app = express();

  // Middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      secret: config.server.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 3600000, // 1 hour
      },
    })
  );

  // Static files - works both in development (src) and production (dist)
  const publicDir = path.join(__dirname, '..', 'public');
  app.use('/public', express.static(publicDir));

  // View engine - looks for views in same directory as compiled JS
  const viewsDir = path.join(__dirname, 'views');
  app.set('view engine', 'ejs');
  app.set('views', viewsDir);

  // Routes
  app.use('/', createRoutes({ config, sp, idp }));

  // Start server
  app.listen(config.server.port, () => {
    console.log(`\nSAML SP Test Tool running at ${config.server.baseUrl}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /          - Home page`);
    console.log(`  GET  /metadata  - SP Metadata XML`);
    console.log(`  GET  /login     - Start SAML login`);
    console.log(`  POST /acs       - Assertion Consumer Service`);
    console.log(`  GET  /profile   - View attributes`);
    console.log(`  GET  /debug     - View raw SAML response`);
    console.log(`  GET  /logout    - Logout`);
  });
}

main().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});
