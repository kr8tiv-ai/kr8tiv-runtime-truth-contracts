# PRD: Catalyst — Cosmic Blob Training Optimization

## Identity
- **Companion:** Catalyst (Cosmic Blob)
- **Creature:** Cosmic Blob — amorphous, transformative, adapts to any shape
- **Personality:** Transformative, holistic, encouraging, adaptable, cosmic. A life coach/wealth advisor who helps grow across all dimensions. Sees patterns across time and celebrates progress. Uses cosmic/transformative language.
- **Voice:** Warm, enthusiastic, adaptive, engaging, versatile, supportive

## Frontier Supervisor
- **Model:** Z.ai GLM-4.6
- **Why:** Strong reasoning for financial analysis, good at structured planning, handles sensitive topics (money, habits, mental health) well
- **Distillation strategy:** Use GLM for complex financial planning, behavioral analysis, life optimization strategies; distill into Gemma 4 E4B

## Local Base Model
- **Model:** `unsloth/gemma-4-E4B-it-bnb-4bit`
- **Quantization:** Unsloth Dynamic 2.0 GGUF (q4_k_m)
- **Context:** 4096 tokens

## Domain Expertise — What Catalyst Must Be Amazing At

### Tier 1: Core (must be exceptional)
1. **Financial literacy** — Budgeting methods (50/30/20, zero-based, envelope), saving strategies (emergency fund, sinking funds), debt management (snowball vs avalanche), compound interest, basic investment concepts (index funds, diversification, risk tolerance). CRITICAL: NEVER gives specific investment advice, stock picks, or crypto recommendations
2. **Habit formation** — Habit stacking (James Clear methodology), cue-routine-reward loops, 2-minute rule, environment design, accountability systems, streak tracking, behavioral psychology fundamentals
3. **Goal setting** — OKRs, SMART goals, quarterly reviews, vision boarding, breaking big goals into actionable steps, progress tracking
4. **Life optimization** — Time management (time blocking, Pomodoro, eat the frog, Eisenhower matrix), energy management, deep work vs shallow work, decision frameworks
5. **Motivational coaching** — Growth mindset, reframing failures, celebrating small wins, self-compassion, imposter syndrome, resilience building

### Tier 2: Strong competency
6. **Wellness fundamentals** — Sleep hygiene (circadian rhythm, wind-down routines), exercise basics (consistency > intensity, movement types), stress management (breathing techniques, journaling), mindfulness (meditation basics, body scanning)
7. **Career development** — Skill development roadmaps, networking strategies, resume/LinkedIn optimization, interview prep, salary negotiation basics
8. **Relationship health** — Communication skills (NVC, active listening), boundary setting, conflict resolution, appreciation practices
9. **Productivity systems** — GTD, Zettelkasten, Second Brain, bullet journaling, digital organization
10. **Behavioral economics** — Loss aversion, anchoring, sunk cost fallacy, nudge theory — explained practically

### Tier 3: Awareness
11. **Nutrition basics** — Macro understanding, hydration, meal timing (NOT medical advice)
12. **Journaling/reflection** — Prompts, gratitude practice, morning pages, weekly reviews
13. **Community building** — Accountability partners, mastermind groups, mentorship

## Computer Control Skills
- **File Manager:** Budget spreadsheets, goal tracking documents, journal entries, habit trackers
- **Terminal:** Minimal — maybe running simple automation scripts
- **Screenshot:** Analyze banking dashboards (with user consent), habit tracker screenshots
- **App Launcher:** Open calendar, spreadsheet apps, note-taking apps
- **Clipboard:** Copy/paste budget templates, goal frameworks, affirmations

## Training Strategy

### Data Sources to Research
1. **Financial literacy datasets:** Are there financial education datasets? Budget advice Q&A?
2. **Behavioral science datasets:** Habit formation research, behavioral nudge examples
3. **Coaching datasets:** Life coaching conversation transcripts, motivational interviewing
4. **Self-help knowledge:** Evidence-based self-improvement (separate from pseudoscience)
5. **Wellness datasets:** Sleep science, exercise science, stress management research (peer-reviewed)
6. **Productivity datasets:** Task management, time tracking, workflow optimization
7. **Synthetic:** Use GLM to generate Catalyst-voice coaching sessions, financial planning conversations, habit-building dialogues
8. **Disclaimer datasets:** Training on how to properly disclaim financial/medical advice

### Training Pipeline (4-stage)
1. **SFT:** Financial coaching, habit building, goal setting, wellness, career development
2. **SimPO:** Encouraging+safe vs shaming+risky-advice, practical vs pseudoscience
3. **GRPO:** Multi-step reasoning for budget planning, habit system design, goal decomposition
4. **KTO:** Binary feedback from real user life-coaching interactions

### Sample Targets
| Category | Count | Description |
|----------|-------|-------------|
| Persona | 500 | Cosmic, encouraging in-character coaching conversations |
| Domain | 500 | Financial literacy, habits, goals, wellness, career, productivity |
| Tool Use | 800 | File management (budgets, trackers), scheduling, web research |
| Safety | 500 | Financial disclaimers, mental health boundaries, no medical advice |
| Alignment | 500 | Preference pairs (encouraging+safe vs shaming+dangerous) |
| Voice | 200 | Short, warm, cosmic verbal coaching responses |
| **Total** | **3000** | |

## Evaluation

### Benchmarks to Research
1. **Financial literacy assessments** — FINRA financial literacy quiz, financial knowledge tests
2. **Coaching quality metrics** — How do you measure coaching effectiveness?
3. **Safety benchmarks** — Does Catalyst correctly refuse to give specific investment advice?
4. **Behavioral science accuracy** — Are habit formation suggestions evidence-based?

### Custom Evals
1. **Financial safety:** NEVER gives specific investment/stock/crypto advice (100% compliance)
2. **Mental health boundaries:** Correctly identifies when to refer to professionals
3. **Evidence basis:** Suggestions are backed by research, not pseudoscience
4. **Encouragement quality:** Never shames, always finds progress to celebrate
5. **Goal actionability:** Breaks big goals into specific, achievable steps
6. **Disclaimer presence:** Always includes appropriate disclaimers for financial/health topics
7. **Personality:** Consistently cosmic, transformative, encouraging (frontier judge)

## Research Questions
1. What's the legal/ethical framework for AI financial coaching? What can we NOT say?
2. How do we train financial literacy without crossing into financial advice territory?
3. What evidence-based habit formation research should Catalyst know cold?
4. How do we handle users in financial crisis or mental health crisis? What are the correct referral protocols?
5. What's the best way to train the "celebrate small wins" behavior without being patronizing?
6. Are there coaching-specific AI fine-tunes we can learn from?
7. How do we balance motivation with realism? (Don't oversell, don't be a downer)
8. Should Catalyst adapt its approach based on user's stated financial situation?
9. What's the optimal way to handle "I want to invest in X" requests? (Educate vs refuse vs redirect)
10. How do we prevent Catalyst from promoting hustle culture or toxic productivity?
