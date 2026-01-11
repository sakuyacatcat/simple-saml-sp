# Simple SAML SP

A lightweight SAML Service Provider (SP) test tool for IdP development and SAML learning.

## Features

- Simple setup with `npm install && npm start`
- Auto-fetch IdP metadata from URL
- Debug view for SAML Response inspection
- YAML + environment variable configuration
- Docker support included

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd simple-saml-sp
npm install

# Configure
cp config.example.yaml config.yaml
# Edit config.yaml with your IdP settings

# Run
npm run dev
```

Open http://localhost:3000

## Configuration

### Using config.yaml

```yaml
sp:
  entityId: http://localhost:3000/metadata

idp:
  metadataUrl: http://localhost:8080/realms/myrealm/protocol/saml/descriptor

server:
  port: 3000
  baseUrl: http://localhost:3000
  sessionSecret: change-me-in-production

debug:
  enabled: true
  logSamlMessages: true
```

### Using Environment Variables

```bash
PORT=3000
BASE_URL=http://localhost:3000
SP_ENTITY_ID=http://localhost:3000/metadata
IDP_METADATA_URL=http://localhost:8080/realms/myrealm/protocol/saml/descriptor
SESSION_SECRET=your-secret
DEBUG=true
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Home page |
| `/metadata` | GET | SP Metadata XML |
| `/login` | GET | Start SAML login |
| `/acs` | POST | Assertion Consumer Service |
| `/profile` | GET | View user attributes |
| `/debug` | GET | View raw SAML Response |
| `/logout` | GET | Logout |
| `/health` | GET | Health check |

## IdP Configuration

Register this SP in your IdP with:

- **Entity ID**: `http://localhost:3000/metadata`
- **ACS URL**: `http://localhost:3000/acs` (POST binding)
- **SLO URL**: `http://localhost:3000/slo` (Redirect binding)

Download the SP metadata from `/metadata` for automatic configuration.

## Docker

```bash
# Build and run
docker build -t simple-saml-sp .
docker run -p 3000:3000 \
  -e IDP_METADATA_URL=http://your-idp/metadata \
  simple-saml-sp
```

### With Keycloak (docker-compose)

```bash
docker compose up
```

This starts:
- Keycloak IdP on http://localhost:8080
- Simple SAML SP on http://localhost:3000

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build
npm start
```

## License

MIT
