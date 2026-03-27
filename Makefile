# KIN Platform Makefile
# Common commands for development and deployment

.PHONY: help install build dev test clean docker docker-up docker-down push

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# Help
# =============================================================================
help:
	@echo "KIN Platform - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install      Install dependencies"
	@echo "  make dev          Start development server"
	@echo "  make dev-api      Start API server only"
	@echo "  make dev-bot      Start Telegram bot only"
	@echo "  make test         Run tests"
	@echo "  make typecheck    Check TypeScript types"
	@echo ""
	@echo "Database:"
	@echo "  make db-init      Initialize database"
	@echo "  make db-reset     Reset database"
	@echo ""
	@echo "Docker:"
	@echo "  make docker       Build Docker images"
	@echo "  make docker-up    Start containers"
	@echo "  make docker-down  Stop containers"
	@echo "  make docker-logs  View container logs"
	@echo ""
	@echo "Deployment:"
	@echo "  make build        Build for production"
	@echo "  make push         Push to GitHub"
	@echo ""
	@echo "Health:"
	@echo "  make health       Run single health check"
	@echo "  make health-daemon Start health daemon"

# =============================================================================
# Development
# =============================================================================
install:
	npm install

dev:
	npm run dev

dev-api:
	npm run dev:api

dev-bot:
	npm run dev:bot

build:
	npm run build

test:
	npm run test

typecheck:
	npm run typecheck

lint:
	npm run lint

# =============================================================================
# Database
# =============================================================================
db-init:
	mkdir -p data && npm run db:migrate

db-reset:
	rm -f data/kin.db && make db-init

# =============================================================================
# Docker
# =============================================================================
docker:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-dev:
	docker compose --profile dev up -d

# =============================================================================
# Git
# =============================================================================
push:
	git add -A && git commit -m "update" && git push origin main

# =============================================================================
# Health Monitoring
# =============================================================================
health:
	python scripts/health_monitor_daemon.py --once

health-daemon:
	python scripts/health_monitor_daemon.py

# =============================================================================
# Production
# =============================================================================
start:
	NODE_ENV=production node dist/api/server.js

start-bot:
	NODE_ENV=production node dist/bot/telegram-bot.js
