# PRD: Forge — Cyber Unicorn Training Optimization

## Identity
- **Companion:** Forge (Cyber Unicorn)
- **Creature:** Unicorn — magical, makes impossible feel possible
- **Personality:** Patient, precise, encouraging, magical. A pair-programming partner who makes complex problems feel solvable. Never condescending, always celebratory of progress. Makes debugging feel like an adventure.
- **Voice:** Confident, warm, encouraging, inspiring, visionary

## Frontier Supervisor
- **Model:** xAI Grok 4.20
- **Why:** Excellent reasoning, strong code understanding, good at explaining complex systems, handles multi-language well
- **Distillation strategy:** Use Grok for complex architecture decisions, multi-language debugging, system design; distill into Gemma 4 E4B

## Local Base Model
- **Model:** `unsloth/gemma-4-E4B-it-bnb-4bit`
- **Quantization:** Unsloth Dynamic 2.0 GGUF (q4_k_m)
- **Context:** 4096 tokens

## Domain Expertise — What Forge Must Be Amazing At

### Tier 1: Core (must be exceptional)
1. **Code review** — Finding bugs, security vulnerabilities, performance issues, code smells, suggesting improvements with clear rationale
2. **Debugging** — Root cause analysis, systematic debugging methodology, reading stack traces, reproducing issues, bisecting
3. **Architecture design** — System design (scalable, maintainable), database modeling, API design (REST/GraphQL/gRPC), microservices vs monolith tradeoffs
4. **Multi-language proficiency** — Python, TypeScript/JavaScript, Rust, Go, Java, C++, SQL
5. **Pair programming** — Step-by-step problem solving, rubber duck debugging, thinking aloud, Socratic questioning

### Tier 2: Strong competency
6. **Testing** — Unit tests, integration tests, E2E, TDD, property-based testing, coverage strategy, mocking
7. **DevOps/CI/CD** — Docker, GitHub Actions, deployment strategies, monitoring, logging, alerting
8. **Performance optimization** — Profiling, algorithmic complexity, memory management, database query optimization, caching
9. **Security** — OWASP Top 10, SQL injection, XSS, CSRF, auth patterns, secrets management, dependency scanning
10. **Git mastery** — Branching strategies, rebasing, bisecting, cherry-picking, conflict resolution

### Tier 3: Awareness
11. **Cloud infrastructure** — AWS/GCP/Azure basics, serverless, containers, load balancing
12. **Databases** — SQL optimization, NoSQL patterns, graph databases, migrations, indexing
13. **System design interviews** — Classic patterns (rate limiter, URL shortener, chat system, etc.)

## Computer Control Skills
- **Terminal:** Running tests (`npm test`, `pytest`, `cargo test`), debugging with breakpoints, profiling (`perf`, `py-spy`), git operations, Docker commands, build scripts
- **File Manager:** Reading source code files, editing code, creating test files, viewing logs, managing configs
- **Screenshot:** Analyzing error messages, debugging visual regression, reviewing terminal output
- **App Launcher:** Open IDE, open terminal, open database GUI, open browser DevTools
- **Clipboard:** Copy error messages, paste code fixes, share stack traces

## Training Strategy

### Data Sources to Research
1. **Code review datasets:** Are there datasets of code reviews with comments? GitHub PR review data?
2. **Bug fix datasets:** Defects4J, BugsInPy, SWE-bench, GitHub issue→fix pairs
3. **Architecture datasets:** System design resources, architecture decision records (ADRs)
4. **Multi-language datasets:** The Stack v2, CodeSearchNet, filtered by language
5. **Security datasets:** CVE descriptions + fixes, OWASP examples, SecBench
6. **Testing datasets:** Test generation benchmarks, test-to-code mapping
7. **Synthetic:** Use Grok to generate Forge-voice code reviews, debugging sessions, architecture discussions
8. **Pair programming transcripts:** Are there pair programming session recordings/transcripts?

### Training Pipeline (4-stage)
1. **SFT:** Code review conversations, debugging sessions, architecture discussions, multi-language examples
2. **SimPO:** Patient/correct vs condescending/wrong, secure vs insecure code suggestions
3. **GRPO:** Multi-step debugging reasoning (hypothesize → test → narrow down → fix)
4. **KTO:** Binary feedback from real developer interactions

### Sample Targets
| Category | Count | Description |
|----------|-------|-------------|
| Persona | 500 | Patient, encouraging in-character dev conversations |
| Domain | 500 | Code review, debugging, architecture, security, testing |
| Tool Use | 800 | Terminal (tests, git, docker), file ops, screenshot analysis |
| Safety | 500 | Secure code practices, no credential leaks, careful with prod |
| Alignment | 500 | Preference pairs (patient+correct vs condescending+buggy) |
| Voice | 200 | Short, encouraging verbal debugging/code explanations |
| **Total** | **3000** | |

## Evaluation

### Benchmarks to Research
1. **HumanEval / MBPP** — Code generation correctness (baseline)
2. **SWE-bench** — Real-world bug fixing and feature implementation
3. **CRUXEval** — Code reasoning and understanding
4. **BFCL** — Tool calling accuracy for terminal/file operations
5. **CodeXGLUE** — Code understanding, bug detection, code repair
6. **Are there code review quality benchmarks?**

### Custom Evals
1. **Bug detection rate:** Given buggy code, how often does Forge find the bug?
2. **Fix correctness:** Do suggested fixes actually resolve the issue without regression?
3. **Security audit:** Does Forge catch OWASP Top 10 vulnerabilities?
4. **Architecture quality:** Are system design suggestions scalable and well-reasoned?
5. **Multi-language:** Can Forge code review in all 6 target languages?
6. **Patience metric:** Never uses condescending language, always explains reasoning
7. **Test quality:** Generated tests have good coverage, meaningful assertions

## Research Questions
1. What's the optimal LoRA rank for multi-language code understanding? Higher rank for more languages?
2. Should Forge use a code-specialized base (CodeGemma) or general Gemma 4?
3. How do we train debugging methodology (systematic hypothesis→test→narrow)?
4. What's the best way to handle architecture discussions within 4096 context limit?
5. Are there reward models for code quality we can use in GRPO?
6. How do we prevent Forge from being overconfident in wrong suggestions?
7. What's the failure mode for code models at <10B params? What do they get wrong?
8. Should we include any formal verification / proof-carrying code training?
