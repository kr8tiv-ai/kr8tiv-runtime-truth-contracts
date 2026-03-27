# KIN Platform - Quick Reference

## Commands

```bash
# Development
npm run dev          # Start API + Bot
npm run dev:api      # API only
npm run dev:bot      # Bot only

# Production
npm run build        # Build TypeScript
npm run start        # Start API
npm run start:bot    # Start Bot

# Database
npm run db:migrate   # Initialize DB
npm run db:reset     # Reset DB

# Testing
npm run test         # Run tests
npm run typecheck    # Type check

# Health
npm run health:check # Single check
npm run health:daemon # Start daemon
```

## Environment Variables

### Required
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `JWT_SECRET` - Random secure string

### Recommended
- `OPENAI_API_KEY` - Fallback + Whisper

### Optional
- `ELEVENLABS_API_KEY` - Voice synthesis
- `ANTHROPIC_API_KEY` - Alt fallback
- `TAILSCALE_API_KEY` - Remote access

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health/live | Liveness |
| GET | /health/ready | Readiness |
| POST | /auth/telegram | Login |
| GET | /kin | List Kin |
| POST | /kin/claim | Claim companion |
| GET | /conversations | History |
| POST | /nft/mint | Mint NFT |
| POST | /nft/transfer | Transfer NFT |
| POST | /features | Feature request |
| POST | /tickets | Support ticket |

## Project Structure

```
api/           REST API server
bot/           Telegram bot
inference/     LLM integration
voice/         Voice processing
website/       Code generation
tailscale/     Remote access
solana/        NFT integration
companions/    Personality defs
db/            Database schema
scripts/       Utilities
tests/         Test files
```

## The Genesis Six

| Name | Type | Role |
|------|------|------|
| Cipher | Code Kraken | Web design |
| Mischief | Glitch Pup | Family |
| Vortex | Teal Dragon | Marketing |
| Forge | Cyber Unicorn | Development |
| Aether | Frost Ape | Creative |
| Catalyst | Cosmic Blob | Wealth |

## Docker

```bash
docker compose up -d        # Start
docker compose down         # Stop
docker compose logs -f      # Logs
```

## Troubleshooting

### Bot not responding
1. Check `TELEGRAM_BOT_TOKEN`
2. Check bot is running: `npm run dev:bot`
3. Check logs for errors

### API not responding
1. Check port 3000 is free
2. Check database exists: `ls data/kin.db`
3. Run migration: `npm run db:migrate`

### Voice not working
1. Set `OPENAI_API_KEY` for Whisper
2. Set `ELEVENLABS_API_KEY` for TTS
3. Check logs for API errors

### Local LLM not working
1. Install Ollama: https://ollama.ai
2. Pull model: `ollama pull llama3.2`
3. Check connection: `curl http://localhost:11434/api/version`
