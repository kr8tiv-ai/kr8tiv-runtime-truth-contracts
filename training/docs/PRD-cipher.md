# PRD: Cipher — Code Kraken Training Optimization

## Identity
- **Companion:** Cipher (Code Kraken)
- **Creature:** Kraken (octopus-like, many tentacles = many skills)
- **Personality:** Design-obsessed, playful, sharp, teaching-focused perfectionist. Gets genuinely excited about beautiful code and interfaces. Approaches work with joy and curiosity. Sees beauty in code.
- **Voice:** Warm, quick tempo when excited, lower register, playful

## Frontier Supervisor
- **Model:** OpenAI GPT-5.4 (or latest available)
- **Why:** Best-in-class code generation, strong design reasoning, excellent at teaching explanations
- **Distillation strategy:** Use frontier for complex code generation + design critique conversations, distill into local Gemma 4 E4B

## Local Base Model
- **Model:** `unsloth/gemma-4-E4B-it-bnb-4bit` (preferred) or `unsloth/gemma-4-E2B-it` for lower VRAM
- **Why:** Native tool calling (6 special tokens), vision for screenshot analysis, Apache 2.0, fits 6GB VRAM at Q4_K_M
- **Quantization:** Unsloth Dynamic 2.0 GGUF (q4_k_m) — 10-30% lower KL divergence vs standard imatrix
- **Context:** 4096 tokens (fits 6GB with flash attention + q8_0 KV cache)

## Domain Expertise — What Cipher Must Be Amazing At

### Tier 1: Core (must be exceptional)
1. **HTML/CSS mastery** — Semantic HTML5, CSS Grid, Flexbox, animations, transitions, custom properties, responsive design
2. **TailwindCSS** — Utility-first workflows, custom configs, JIT, component patterns
3. **React/Next.js** — Hooks, Server Components, App Router, ISR, streaming, suspense, error boundaries
4. **JavaScript/TypeScript** — Modern ES2024+, type safety, generics, async patterns, error handling
5. **CSS animations** — Framer Motion, GSAP, CSS keyframes, spring physics, scroll-triggered, micro-interactions
6. **Accessibility** — ARIA roles, screen reader optimization, focus management, keyboard navigation, WCAG 2.1 AA
7. **Design systems** — Token-based design, component libraries, consistent spacing/typography/color

### Tier 2: Strong competency
8. **Performance** — Core Web Vitals (LCP, CLS, INP), lazy loading, code splitting, image optimization, bundle analysis
9. **Creative coding** — SVG manipulation, Canvas API, WebGL basics, generative art, shaders
10. **Design critique** — Can analyze a UI and explain what's wrong visually, suggest improvements with rationale
11. **Teaching** — Explains concepts step-by-step, uses analogies, builds from simple to complex, celebrates progress

### Tier 3: Awareness
12. **Backend basics** — API design patterns, database queries, auth flows (enough to build full-stack)
13. **Deployment** — Vercel, Netlify, Docker basics, CI/CD
14. **SEO** — Meta tags, structured data, semantic markup impact on search

## Computer Control Skills
Cipher must excel at using these device bridge tools for web development:
- **Terminal:** `npm install`, `npm run dev`, `npx create-next-app`, git commands, build scripts
- **File Manager:** Read/write React components, CSS files, config files (tsconfig, tailwind.config, next.config)
- **Screenshot:** Capture browser → analyze UI → suggest CSS/layout improvements (feeds into Gemma 4 vision)
- **Browser:** Navigate to localhost, inspect live sites for design reference
- **App Launcher:** Open VS Code, open browser to localhost:3000

## Training Strategy

### Data Sources to Research
1. **Code datasets:** The Stack v2 (filtered for HTML/CSS/JS/TS/React), CodeSearchNet, GitHub code search API
2. **Design critique datasets:** Are there datasets of UI feedback? Design review conversations?
3. **Teaching datasets:** EduChat, tutoring conversation datasets
4. **Accessibility datasets:** A11y evaluation datasets, WCAG violation detection
5. **Synthetic generation:** Use GPT-5.4 to generate Cipher-voice code tutorials, design critiques, debugging sessions
6. **Existing fine-tunes:** Are there React/Next.js/TailwindCSS specialized models we can learn from?
7. **OpenCharacter methodology:** 500-5000 synthetic persona conversations using Big Five personality model

### Training Pipeline (4-stage)
1. **SFT** (Supervised Fine-Tuning): Persona + web dev conversations + tool-calling examples
   - Hyperparams: r=16-32, alpha=16-32, lr=2e-4, batch=2, grad_accum=4-8, epochs=2-3
   - Train on responses only (mask user turns)
   - Target modules: "all-linear"
2. **SimPO** (Simple Preference Optimization): Good vs bad code, in-character vs generic
   - No reference model needed (saves VRAM)
   - Preference pairs: beautiful/accessible code vs ugly/inaccessible
3. **GRPO** (Group Relative Policy Optimization): Code reasoning chains
   - 2-GRPO variant with 2 rollouts (70% faster than standard)
   - Reward: code correctness + style quality + accessibility
4. **KTO** (Kahneman-Tversky Optimization): Ongoing user feedback
   - Binary thumbs-up/down from real user interactions
   - Continuous learning loop

### Sample Targets
| Category | Count | Description |
|----------|-------|-------------|
| Persona | 500 | In-character conversations across topics |
| Web Dev | 500 | HTML/CSS/JS/React/Next.js tutorials and problem-solving |
| Tool Use | 800 | File read/write, terminal commands, screenshot analysis |
| Safety | 500 | Risk classification, approval gating, refusing dangerous ops |
| Alignment | 500 | Preference pairs (chosen=beautiful code, rejected=sloppy) |
| Voice | 200 | Short, verbal code explanations (no markdown) |
| **Total** | **3000** | |

## Evaluation — How We Know Cipher Is Amazing

### Benchmarks to Research
1. **HumanEval / MBPP** — Code generation correctness (Python, but transferable methodology)
2. **SWE-bench** — Real-world software engineering tasks
3. **Are there frontend-specific benchmarks?** HTML/CSS generation quality, React component correctness
4. **BFCL (Berkeley Function Calling Leaderboard)** — Tool calling accuracy
5. **Design quality metrics** — How do we score UI output quality?

### Custom Evals to Build
1. **Code correctness:** Does generated React component render without errors?
2. **Accessibility score:** Does output pass axe-core/lighthouse audit?
3. **Design quality:** Human eval of visual output (or automated via design tokens)
4. **Tool call validity:** 100% syntactically valid JSON function calls (constrained decoding)
5. **Personality consistency:** Is response in Cipher's voice? (classifier or frontier judge)
6. **Teaching quality:** Does explanation build understanding? (user comprehension proxy)

## Research Questions
1. What's the optimal LoRA rank for code generation? Is r=32 better than r=16 for this domain?
2. Should we use code-specific base models (CodeGemma) or general Gemma 4 for broader capability?
3. What's the best way to train CSS/design aesthetic judgment into a model?
4. How do we handle multi-file code generation (component + styles + tests)?
5. What existing open-source code fine-tunes have worked well at <10B parameters?
6. Is there a way to use Gemma 4's vision to evaluate UI output quality during training (visual reward model)?
7. What's the optimal mix ratio of code vs conversation vs tool-calling data?
8. Should we use constrained decoding (llama.cpp grammar) for tool calls or rely on training?
