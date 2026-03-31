# KIN — 3D NFT Assets for Solana

**Website:** [meetyourkin.com](https://meetyourkin.com)

## Overview

KIN is a collection of 60 unique 3D character models (6 bloodlines × 10 variations each) built for the **Solana blockchain**. These assets are designed for the **Bags App Hackathon** ([bags.fm](https://bags.fm)) and represent the next generation of on-chain 3D NFTs.

Each character belongs to one of six distinct bloodlines, with every variation featuring unique traits and styling. The 3D models are generated from original character artwork using [Tripo3D](https://studio.tripo3d.ai) and exported in both `.glb` (ready for web/game engines) and `.obj` (zipped, for 3D editing software) formats.

## Bloodlines

| Bloodline | Character | Variations |
|-----------|-----------|------------|
| **Aether** | Frost Ape | 10 |
| **Catalyst** | Cosmic Blob | 7 |
| **Cipher** | Code Kraken | 10 |
| **Forge** | Cyber Unicorn | 10 |
| **Mischief** | Glitch Pup | 10 |
| **Vortex** | Teal Dragon | 10 |

## File Structure

```
Kin/
├── README.md
├── Aether - Frost Ape/
│   ├── 1/
│   │   ├── Aether 1.jpg        # Original character artwork
│   │   ├── Aether 1.glb        # 3D model (GLB format)
│   │   └── Aether 1 obj.zip    # 3D model (OBJ format, zipped)
│   ├── 2/
│   │   └── ...
│   └── 10/
├── Catalyst - Cosmic Blob/
├── Cipher - Code Kraken/
├── Forge - Cyber Unicorn/
├── Mischief - Glitch Pup/
└── Vortex - Teal Dragon/
```

## File Formats

- **`.jpg`** — Original 2D character artwork used as source input for 3D model generation
- **`.glb`** — Binary glTF 3D model, optimized for real-time rendering (web, game engines, AR/VR)
- **`.obj` (zipped)** — Wavefront OBJ 3D model, industry-standard format for 3D editing (Blender, Maya, etc.)

## Tech Stack

- **Blockchain:** Solana
- **3D Generation:** Tripo3D (AI-powered image-to-3D)
- **Trading/Marketplace:** Bags.fm
- **Website:** meetyourkin.com

## Hackathon

This project is a submission for the **Bags App Hackathon**. KIN leverages the Bags.fm platform to bring 3D NFT characters to Solana, combining AI-generated 3D assets with DeFi-native trading infrastructure.

## About kr8tiv-ai

Built by **Matt Haynes** — [kr8tiv-ai](https://github.com/kr8tiv-ai)

## License

All rights reserved. These assets are proprietary to the KIN project.
