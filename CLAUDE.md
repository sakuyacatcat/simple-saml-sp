# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simple SAML SP is a lightweight SAML 2.0 Service Provider test tool for IdP development and SAML learning. It uses the samlify library for SAML protocol handling with Express as the web framework.

## Development Commands

```bash
# Install dependencies
npm install

# Development with hot reload (tsx watch)
npm run dev

# Build TypeScript to dist/
npm run build

# Run production build
npm start

# Start Keycloak IdP only (recommended for development)
make idp-up    # Start Keycloak on :8080
make idp-down  # Stop Keycloak

# Full Docker environment (SP + Keycloak)
make docker-up
make docker-down
```

## Architecture

```
src/
├── index.ts          # Entry point - Express app setup, middleware, server start
├── config.ts         # Config loading (config.yaml + environment variables)
├── routes/
│   └── index.ts      # All HTTP endpoints (/, /login, /acs, /metadata, etc.)
├── saml/
│   ├── sp.ts         # Service Provider instance creation (samlify)
│   ├── idp.ts        # Identity Provider metadata fetching and parsing
│   └── cert.ts       # Self-signed certificate generation (node-forge)
└── views/            # EJS templates for web pages
```

### SAML Flow (SP-Initiated SSO)

1. `/login` - SP generates AuthnRequest, redirects to IdP
2. User authenticates at IdP (Keycloak)
3. `/acs` (POST) - SP receives SAMLResponse, validates signature, extracts attributes
4. Session created, user redirected to `/profile`

### Configuration Priority

Environment variables override config.yaml values:
- `IDP_METADATA_URL` / `idp.metadataUrl` - URL to fetch IdP metadata
- `SP_ENTITY_ID` / `sp.entityId` - SP identifier
- `BASE_URL` / `server.baseUrl` - SP base URL

## Key Implementation Details

- **Schema validation disabled** in `src/index.ts` for testing purposes (line 16-18)
- **SP certificate auto-generated** at startup via `src/saml/cert.ts` (not persisted)
- **IdP metadata** fetched from URL at startup, or can be manually configured
- **Debug mode** (`debug.enabled: true`) shows detailed SAML messages at `/debug`

## Test Environment

- **Keycloak**: http://localhost:8080 (admin/admin)
- **SP**: http://localhost:3000
- **Test user**: testuser / password
- **IdP config**: `idp/realm-export.json` (auto-imported by Keycloak)
