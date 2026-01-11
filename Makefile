.PHONY: dev start build clean install idp-up idp-down idp-logs docker-up docker-down docker-logs docker-build help

# Default target
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Recommended (local SP + Docker IdP):"
	@echo "  idp-up      Start Keycloak only (Docker)"
	@echo "  dev         Start SP locally (hot reload)"
	@echo "  idp-down    Stop Keycloak"
	@echo ""
	@echo "Development:"
	@echo "  install     Install dependencies"
	@echo "  build       Build TypeScript"
	@echo "  start       Run built application"
	@echo "  clean       Remove build artifacts"
	@echo ""
	@echo "Docker (all in containers):"
	@echo "  docker-up   Start Keycloak + SP containers"
	@echo "  docker-down Stop all containers"
	@echo "  docker-logs View SP container logs"
	@echo ""
	@echo "URLs:"
	@echo "  SP:       http://localhost:3000"
	@echo "  Keycloak: http://localhost:8080 (admin/admin)"
	@echo "  Test user: testuser / password"

# Development
install:
	npm install

dev:
	npm run dev

build:
	npm run build

start: build
	npm start

clean:
	rm -rf dist node_modules

# Keycloak only (recommended for local development)
idp-up:
	docker compose up -d idp
	@echo ""
	@echo "Keycloak starting at http://localhost:8080"
	@echo "Wait ~30s for startup, then run: make dev"

idp-down:
	docker compose down

idp-logs:
	docker compose logs -f idp

# Docker (all containers)
docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f sp
