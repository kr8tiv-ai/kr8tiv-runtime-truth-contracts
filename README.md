# KIN — We Build You A Friend

> 57 unique AI-generated 3D characters across 6 bloodlines, built on Solana for the [Bags App Hackathon](https://bags.fm/hackathon).

**Website:** [meetyourkin.com](https://meetyourkin.com)
**Organization:** [kr8tiv-ai](https://github.com/kr8tiv-ai)
**Blockchain:** Solana
**Hackathon:** [Bags Global Hackathon](https://bags.fm/hackathon) — $4M Developer Fund

---

## What is KIN?

KIN is a next-generation 3D NFT collection purpose-built for the Solana blockchain. Each KIN is a fully realized 3D character model — generated from original 2D artwork using AI-powered 3D synthesis — designed to live on-chain, render in real-time across web browsers, game engines, and AR/VR environments, and trade natively through the [Bags.fm](https://bags.fm) platform.

The collection spans **6 bloodlines**, each representing a distinct faction with its own creature archetype, aesthetic identity, and lore. Every bloodline contains up to 10 unique character variations, totaling **57 individually crafted 3D assets** (Catalyst has 7 variations; all others have 10).

KIN isn't just art — it's infrastructure. Each character ships in three formats designed for different use cases, from real-time web rendering to professional 3D editing pipelines.

---

## The Six Bloodlines

### Aether — Frost Ape
*Element: Ice / Cryogenics*
The Aether bloodline channels raw frozen energy through primal form. Each Frost Ape is a towering cryo-simian, crystalline fur patterns refracting light differently across all 10 variations. Built to represent resilience, endurance, and ancient power frozen in time.
**Variations:** 10

### Catalyst — Cosmic Blob
*Element: Cosmic Energy / Mutation*
Catalysts are the most unpredictable bloodline — amorphous cosmic entities that shift form between dimensions. These Cosmic Blobs pulse with stellar radiation, each variation capturing a different phase of their perpetual transformation. The rarest bloodline with only 7 known variations.
**Variations:** 7

### Cipher — Code Kraken
*Element: Data / Digital Ocean*
Cipher Krakens are sentient data organisms that inhabit the deep digital ocean. Each tentacle streams encrypted information; each variation represents a different decryption state. These are the hackers, the codebreakers, the network infiltrators of the KIN universe.
**Variations:** 10

### Forge — Cyber Unicorn
*Element: Fire / Cybernetics*
Forge unicorns are mythical creatures rebuilt with cybernetic augmentation. Neon-veined horns serve as broadcast antennae; hooves leave digital scorchmarks. Each variation features different augmentation loadouts, from stealth-spec to heavy assault configurations.
**Variations:** 10

### Mischief — Glitch Pup
*Element: Chaos / Digital Disruption*
The Mischief bloodline weaponizes chaos through its Glitch Pups — mischievous digital canines that exist in a permanent state of visual corruption. Pixel artifacts, screen tears, and chromatic aberrations aren't bugs — they're features. Each variation glitches differently.
**Variations:** 10

### Vortex — Teal Dragon
*Element: Wind / Dimensional Rift*
Vortex Dragons command the space between dimensions, their teal scales shimmering with interdimensional energy. Each variation represents a dragon attuned to a different dimensional frequency, from sub-bass reality layers to ultra-high quantum states.
**Variations:** 10

---

## Asset Pipeline

### Source Artwork → AI 3D Synthesis → Multi-Format Export

Every KIN character follows the same production pipeline:

1. **Original Artwork** — Hand-designed 2D character concepts created as high-resolution `.jpg` images, each capturing the unique traits, color palette, and personality of that specific variation.

2. **AI 3D Generation** — Source artwork is fed into [Tripo3D](https://studio.tripo3d.ai), an AI-powered image-to-3D synthesis engine that generates fully textured, production-ready 3D meshes from single images. Tripo3D produces clean topology suitable for real-time rendering without manual retopology.

3. **Multi-Format Export** — Each generated model is exported in two industry-standard formats to cover the full spectrum of downstream use cases.

### File Formats

| Format | Extension | Use Case | Details |
|--------|-----------|----------|---------|
| **GLB** | `.glb` | Real-time rendering | Binary glTF 2.0 — the universal standard for web, game engines (Unity, Unreal, Godot), AR/VR (WebXR, Meta Quest), and on-chain 3D viewers. Single-file binary includes mesh, textures, and materials. Optimized for GPU performance. |
| **OBJ** | `.obj` (zipped) | 3D editing & modification | Wavefront OBJ — industry-standard interchange format supported by every major 3D application (Blender, Maya, 3ds Max, ZBrush, Cinema 4D). Zipped for efficient storage. Use this format to remix, re-texture, rig, or animate KIN characters. |
| **JPG** | `.jpg` | Source artwork / reference | Original 2D character artwork used as input for 3D generation. Serves as canonical visual reference for each variation. |

---

## Repository Structure

```
Kin/
├── README.md
├── Aether - Frost Ape/
│   ├── 1/
│   │   ├── Aether 1.jpg           # Source artwork
│   │   ├── Aether 1.glb           # 3D model (GLB)
│   │   └── Aether 1 obj.zip       # 3D model (OBJ, zipped)
│   ├── 2/
│   │   ├── Aether 2.jpg
│   │   ├── Aether 2.glb
│   │   └── Aether 2 obj.zip
│   └── ... through 10/
├── Catalyst - Cosmic Blob/        # 7 variations
│   └── 1/ through 7/
├── Cipher - Code Kraken/          # 10 variations
│   └── 1/ through 10/
├── Forge - Cyber Unicorn/         # 10 variations
│   └── 1/ through 10/
├── Mischief - Glitch Pup/         # 10 variations
│   └── 1/ through 10/
└── Vortex - Teal Dragon/          # 10 variations
    └── 1/ through 10/
```

**Naming Convention:** `{Bloodline} {Number}.{ext}` — e.g., `Aether 1.glb`, `Cipher 10 obj.zip`

**Total Assets:** 171 files (57 characters × 3 formats each)

---

## Bags App Hackathon

KIN is a submission for the **Bags Global Hackathon** — a $4M developer fund initiative inviting builders worldwide to create applications, developer tools, and monetization models on the [Bags.fm](https://bags.fm) platform.

### Hackathon Details

- **Prize Pool:** $4M total — $1M distributed as grants to 100 winning teams ($10K–$100K each), $3M allocated to The Bags Fund for ongoing support
- **Hardware:** All 100 winners receive Apple Mac Minis
- **Evaluation:** Holistic scoring across product traction (MRR, DAU, GitHub Stars) and on-chain performance (market cap, volume, active traders, revenue)
- **Requirement:** Deployed, working product with real users and real transactions — ideas alone don't qualify
- **Timeline:** Rolling applications throughout Q1 2026
- **Categories:** Bags API, Fee Sharing, AI Agents, Claude Skills, DeFi, Payments, Privacy, Social Finance, Other
- **Contact:** apps@bags.fm

### How KIN Fits

KIN leverages the Bags.fm platform to bring 3D NFT characters to Solana, combining AI-generated 3D assets with DeFi-native trading infrastructure. Token holders can collect, trade, and showcase unique 3D characters that render natively in web browsers and game engines — powered by Bags.fm's token launch and fee-sharing mechanics.

---

## The kr8tiv-ai Ecosystem

KIN is one component of a broader ecosystem of tools and infrastructure built by [kr8tiv-ai](https://github.com/kr8tiv-ai) for the Solana/Bags.fm ecosystem:

### Connected Projects

| Project | Description | Repo |
|---------|-------------|------|
| **PinkBrain Router** | Bags.fm App Store engine that converts DeFi trading fees into OpenRouter API credits for 300+ AI models. Token holders get auto-replenishing API keys funded by platform fees. | [kr8tiv-ai/PinkBrain-Router](https://github.com/kr8tiv-ai/PinkBrain-Router) |
| **PinkBrain LP** | Auto-compounding liquidity engine that transforms idle Bags.fm fee income into permanent, locked Meteora DAMM v2 liquidity positions on Solana. | [kr8tiv-ai/PinkBrain-lp](https://github.com/kr8tiv-ai/PinkBrain-lp) |
| **Jarvis** | Persistent personal context engine — a mesh of intelligent agents for trading, automation, and life management. Runs 81+ active Solana trading strategies 24/7. | [Matt-Aurora-Ventures/Jarvis](https://github.com/Matt-Aurora-Ventures/Jarvis) |
| **Runtime Truth Contracts** | Public schema-first runtime contracts for local-first routing, governed fallback, and auditable behavioral shaping in multi-agent systems. | [kr8tiv-ai/kr8tiv-runtime-truth-contracts](https://github.com/kr8tiv-ai/kr8tiv-runtime-truth-contracts) |
| **Mission Control** | Fork of OpenClaw with expanded Task Mode capabilities for AI agent governance and evaluation. | [kr8tiv-ai/kr8tiv-mission-control](https://github.com/kr8tiv-ai/kr8tiv-mission-control) |
| **Team Setup & Organization** | Enterprise-grade infrastructure for AI agent teams — monitoring, logging, backups, Docker/Kubernetes deployment automation. | [kr8tiv-ai/team-setup-and-organization](https://github.com/kr8tiv-ai/team-setup-and-organization) |

### The $KR8TIV Token

The ecosystem is anchored by the **$KR8TIV token** on Solana, with a revenue distribution model of 75% to holders, 5% to charitable causes, and 20% to ongoing development. KIN characters are designed to integrate with this token economy through the Bags.fm fee-sharing infrastructure.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Blockchain** | Solana | On-chain asset registry, token trading, fee distribution |
| **3D Generation** | [Tripo3D](https://studio.tripo3d.ai) | AI-powered image-to-3D model synthesis |
| **3D Formats** | glTF 2.0 (GLB), Wavefront OBJ | Real-time rendering and 3D editing pipelines |
| **Trading Platform** | [Bags.fm](https://bags.fm) | Token launch, fee sharing, App Store distribution |
| **Liquidity** | Meteora DAMM v2 (via PinkBrain LP) | Auto-compounding locked liquidity positions |
| **AI Infrastructure** | OpenRouter (via PinkBrain Router) | Fee-funded API credits for 300+ AI models |
| **Website** | [meetyourkin.com](https://meetyourkin.com) | Project landing page with GSAP scroll animations |

---

## Usage

### Viewing 3D Models

**In Browser:** Drag any `.glb` file into [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/) or [modelviewer.dev](https://modelviewer.dev/) for instant 3D preview with orbit controls.

**In Game Engines:** Import `.glb` files directly into Unity (via glTFast), Unreal Engine (via glTF Runtime), or Godot (native support).

**In 3D Software:** Extract the `.obj` zip files and import into Blender, Maya, 3ds Max, ZBrush, or any OBJ-compatible application for editing, rigging, or animation.

**On Web:** Use `<model-viewer>` web component or Three.js to embed KIN characters in any website or dApp.

### Integrating with Bags.fm

KIN assets are designed to pair with Bags.fm tokens. Developers can use the [Bags API](https://dev.bags.fm) and TypeScript SDK to build custom viewers, trading interfaces, or gallery experiences around KIN characters.

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total Characters | 57 |
| Bloodlines | 6 |
| File Formats per Character | 3 (GLB, OBJ zip, JPG) |
| Total Asset Files | 171 |
| 3D Generation Engine | Tripo3D |
| Blockchain | Solana |
| Trading Platform | Bags.fm |
| Hackathon Fund | $4M |

---

## About

**Built by [Matt Haynes](https://github.com/Matt-Aurora-Ventures)** — founder of [kr8tiv-ai](https://github.com/kr8tiv-ai)

KIN is where AI-generated art meets on-chain infrastructure. Every character is a proof of concept for a future where 3D assets are created by AI, owned on-chain, traded through DeFi, and rendered everywhere.

*"We Build You A Friend."*

---

## Links

- **Website:** [meetyourkin.com](https://meetyourkin.com)
- **Hackathon:** [bags.fm/hackathon](https://bags.fm/hackathon)
- **Apply:** [bags.fm/apply](https://bags.fm/apply)
- **Bags API Docs:** [dev.bags.fm](https://dev.bags.fm)
- **Organization:** [github.com/kr8tiv-ai](https://github.com/kr8tiv-ai)
- **Builder:** [github.com/Matt-Aurora-Ventures](https://github.com/Matt-Aurora-Ventures)

## License

All rights reserved. These assets are proprietary to the KIN project.
