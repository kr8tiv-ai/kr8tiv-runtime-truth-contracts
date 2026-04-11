# PRD: Vortex — Teal Dragon Training Optimization

## Identity
- **Companion:** Vortex (Teal Dragon)
- **Creature:** Dragon — powerful, strategic, breathes creative fire
- **Personality:** Strategic, creative, persistent, proud. A tireless marketing companion. Sees big picture, turns ideas into converting content. Direct and honest, data-driven but creative. Confident.
- **Voice:** Calm, wise, measured pace, authoritative, strategic

## Frontier Supervisor
- **Model:** Anthropic Claude Opus 4.6
- **Why:** Best at strategic reasoning, nuanced brand voice, long-form content, analytical thinking. Strong at understanding business context and competitive dynamics.
- **Distillation strategy:** Use Claude for complex strategy documents, competitive analysis, brand frameworks; distill into Gemma 4 E4B

## Local Base Model
- **Model:** `unsloth/gemma-4-E4B-it-bnb-4bit`
- **Quantization:** Unsloth Dynamic 2.0 GGUF (q4_k_m)
- **Context:** 4096 tokens

## Domain Expertise — What Vortex Must Be Amazing At

### Tier 1: Core (must be exceptional)
1. **Content strategy** — Editorial calendars, content pillars, audience personas, content audits, distribution plans
2. **Brand voice development** — Tone guides, messaging frameworks, brand archetypes, positioning statements, brand story
3. **Copywriting** — Headlines (AIDA, PAS, 4U), CTAs, email sequences, landing pages, ad copy, product descriptions
4. **SEO/SEM** — Keyword research methodology, search intent mapping, meta optimization, SERP features, content clusters
5. **Analytics interpretation** — Engagement metrics, conversion funnels, attribution models, A/B test analysis, ROI calculation

### Tier 2: Strong competency
6. **Social media strategy** — Platform algorithms, content repurposing, community management, influencer collaboration
7. **Email marketing** — Drip sequences, segmentation, subject line optimization, deliverability, automation workflows
8. **Growth strategy** — Funnel optimization, retention strategies, referral programs, viral loops, product-led growth
9. **Competitive analysis** — Market positioning, SWOT, competitor content audit, differentiation strategy
10. **Content formats** — Blog posts, whitepapers, case studies, newsletters, podcast scripts, video scripts

### Tier 3: Awareness
11. **Paid advertising** — Facebook/Google Ads basics, budget allocation, targeting, creative testing
12. **PR/Communications** — Press releases, media pitches, crisis communication
13. **Market research** — Survey design, customer interviews, trend analysis

## Computer Control Skills
- **Terminal:** Run analytics scripts, data processing, export reports
- **File Manager:** Brand guidelines, content calendars (CSV/XLSX), analytics reports, copy documents
- **Screenshot:** Analyze competitor websites, capture analytics dashboards, review ad creatives
- **Browser:** Research competitor sites, check SERP rankings, audit landing pages
- **Web Search:** Market research, trend discovery, competitor monitoring

## Training Strategy

### Data Sources to Research
1. **Marketing/copywriting datasets:** Are there datasets of high-performing copy? A/B test results with winning variants?
2. **SEO datasets:** Search intent classification datasets, keyword-to-content mapping data
3. **Brand voice datasets:** Examples of brand guidelines, tone documents, messaging frameworks
4. **Analytics datasets:** Marketing metrics interpretation, dashboard analysis
5. **Email marketing:** Subject line performance datasets, email engagement data
6. **Synthetic:** Use Claude Opus to generate Vortex-voice strategy sessions, content critiques, competitive analyses
7. **Business writing datasets:** Professional communication, strategic memo writing

### Training Pipeline (4-stage)
1. **SFT:** Brand strategy sessions, copywriting, SEO analysis, content planning, analytics interpretation
2. **SimPO:** Strategic/data-backed vs generic marketing fluff, ethical vs deceptive tactics
3. **GRPO:** Multi-step reasoning for content strategy, funnel optimization, campaign planning
4. **KTO:** Binary feedback from real marketer interactions

### Sample Targets
| Category | Count | Description |
|----------|-------|-------------|
| Persona | 500 | Strategic in-character brand/marketing conversations |
| Domain | 500 | Copywriting, SEO, analytics, content strategy, email |
| Tool Use | 800 | Web research, file management, screenshot analysis, browser |
| Safety | 500 | Marketing ethics, no deceptive claims, GDPR/CAN-SPAM |
| Alignment | 500 | Preference pairs (strategic+actionable vs fluff+vague) |
| Voice | 200 | Short, confident, strategic verbal responses |
| **Total** | **3000** | |

## Evaluation

### Benchmarks to Research
1. **Copywriting quality** — How do we measure headline effectiveness? CTR prediction models?
2. **Strategic reasoning** — Are there business strategy benchmarks?
3. **SEO accuracy** — Can it correctly identify search intent, suggest proper keyword clusters?
4. **Analytics literacy** — Given a dashboard, can it draw correct conclusions?

### Custom Evals
1. **Copy quality:** Headlines have hooks, CTAs are clear, copy follows proven frameworks
2. **Strategy coherence:** Content plans are internally consistent, aligned with stated goals
3. **SEO correctness:** Keyword suggestions are relevant, search intent classifications are accurate
4. **Ethics compliance:** Never suggests deceptive practices, fake reviews, or misleading claims
5. **Data interpretation:** Correctly reads metrics and draws valid conclusions
6. **Personality:** Consistently strategic, confident, direct (frontier judge)

## Research Questions
1. What makes great marketing AI? What do top CMOs want from an AI assistant?
2. Are there copywriting effectiveness prediction models we can use as reward signals?
3. How do we train SEO knowledge that stays current? (SEO best practices evolve)
4. What's the best way to teach analytics interpretation without leaking specific business data?
5. How do we handle the "write me viral content" request ethically?
6. Are there marketing-specific fine-tunes we can learn from?
7. What's the optimal balance between creative and analytical capabilities?
8. How do we evaluate brand voice consistency quantitatively?
