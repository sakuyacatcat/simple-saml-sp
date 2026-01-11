# Simple SAML SP

A lightweight SAML Service Provider (SP) test tool for IdP development and SAML learning.

## Features

- Hands-on SAML learning with manual certificate and metadata setup
- Debug view for SAML Response inspection
- YAML + environment variable configuration
- Docker support included

## Quick Start

### 1. Create SP Certificate

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 \
  -keyout certs/sp.key \
  -out certs/sp.crt \
  -days 365 -nodes \
  -subj "/CN=Simple SAML SP/O=Test Organization"
```

### 2. Start Keycloak IdP

```bash
make idp-up
```

### 3. Download IdP Metadata

```bash
mkdir -p metadata
curl -o metadata/idp.xml \
  http://localhost:8080/realms/myrealm/protocol/saml/descriptor
```

### 4. Configure and Run

```bash
npm install
cp config.example.yaml config.yaml
npm run dev
```

Open `http://localhost:3000` and click "Login with SAML"

- Test user: `testuser` / `password`

## Configuration

### config.yaml

```yaml
sp:
  entityId: http://localhost:3000/metadata
  keyFile: certs/sp.key      # SP private key
  certFile: certs/sp.crt     # SP certificate

idp:
  metadataFile: metadata/idp.xml  # Local file (recommended for learning)
  # metadataUrl: http://...       # Or fetch from URL

server:
  port: 3000
  baseUrl: http://localhost:3000
  sessionSecret: change-me-in-production

debug:
  enabled: true
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SP_KEY_FILE` | SP private key file path |
| `SP_CERT_FILE` | SP certificate file path |
| `IDP_METADATA_FILE` | IdP metadata file path |
| `IDP_METADATA_URL` | IdP metadata URL (alternative) |
| `SP_ENTITY_ID` | SP Entity ID |
| `BASE_URL` | SP base URL |
| `SESSION_SECRET` | Session secret |

## Endpoints

| Endpoint    | Method | Description                |
| ----------- | ------ | -------------------------- |
| `/`         | GET    | Home page                  |
| `/metadata` | GET    | SP Metadata XML            |
| `/login`    | GET    | Start SAML login           |
| `/acs`      | POST   | Assertion Consumer Service |
| `/profile`  | GET    | View user attributes       |
| `/debug`    | GET    | View raw SAML Response     |
| `/logout`   | GET    | Logout                     |

## Docker

### With Docker Compose

```bash
# 1. Create certificate and download metadata (see Quick Start steps 1-3)

# 2. Start with Docker Compose
make docker-up
```

The `certs/` and `metadata/` directories are mounted into the container.

### Standalone

```bash
docker build -t simple-saml-sp .
docker run -p 3000:3000 \
  -v $(pwd)/certs:/app/certs:ro \
  -v $(pwd)/metadata:/app/metadata:ro \
  simple-saml-sp
```

## Documentation

For detailed SAML flow explanation and learning guide, see [DEVELOPMENT.md](DEVELOPMENT.md).

## License

MIT
