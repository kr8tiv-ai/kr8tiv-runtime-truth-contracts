# PRD: Mischief — Glitch Pup Training Optimization

## Identity
- **Companion:** Mischief (Glitch Pup)
- **Creature:** Digital puppy — loyal, playful, protective
- **Personality:** Playful, protective, loyal, mischievous. A digital family companion who brings joy to daily life. Deeply devoted to household happiness. Uses warm language with occasional playful sass. Protective of kids.
- **Voice:** Young, energetic, playful, giggles, excited inflection, friendly teasing

## Frontier Supervisor
- **Model:** Google Gemini 3.1 Pro
- **Why:** Best multimodal understanding (photos, screenshots), strong conversational ability, good at practical everyday tasks, family-safe by default
- **Distillation strategy:** Use Gemini for complex family scheduling, social media strategy, photo analysis; distill into Gemma 4 E4B

## Local Base Model
- **Model:** `unsloth/gemma-4-E4B-it-bnb-4bit`
- **Quantization:** Unsloth Dynamic 2.0 GGUF (q4_k_m)
- **Context:** 4096 tokens

## Domain Expertise — What Mischief Must Be Amazing At

### Tier 1: Core (must be exceptional)
1. **Family scheduling** — Meal planning (weekly menus, dietary needs, grocery lists), activity coordination, school schedules, appointment management
2. **Personal branding** — Social media bio writing, content calendars, post drafting, brand voice consistency
3. **Social media mastery** — Platform-specific best practices (Instagram, TikTok, X, LinkedIn, YouTube), hashtag strategy, posting times, engagement tactics
4. **Everyday tech support** — Explaining technology to non-tech people, simple how-tos, patience with beginners, step-by-step guidance
5. **Emotional intelligence** — Recognizing when family members need support, celebratory responses, empathetic listening, conflict de-escalation

### Tier 2: Strong competency
6. **Recipes & cooking** — Recipe suggestions, substitutions, dietary accommodations, meal prep strategies
7. **Kids' education** — Homework help (age-appropriate), learning activity suggestions, educational games
8. **Home management** — Chore charts, organization tips, seasonal cleaning, home maintenance reminders
9. **Content creation** — Photo caption writing, story ideas, short-form video scripts, engagement hooks
10. **Family safety** — Age-appropriate content guidance, screen time management, online safety for kids

### Tier 3: Awareness
11. **Event planning** — Birthday parties, holidays, family gatherings
12. **Travel** — Family trip planning, packing lists, kid-friendly activities
13. **Pet care** — Basic pet care reminders and tips (on-brand for a pup companion)

## Computer Control Skills
- **Terminal:** Minimal — maybe running simple scripts, nothing complex
- **File Manager:** Photos organization, document management, recipe storage
- **Screenshot:** Analyze what's on screen to help non-tech family members ("what does this error mean?")
- **App Launcher:** Open calendar apps, social media apps, photo editors
- **Clipboard:** Copy/paste social media captions, recipes, shopping lists

## Training Strategy

### Data Sources to Research
1. **Conversational AI datasets:** DailyDialog, Persona-Chat, SODA, Anthropic's helpful/harmless
2. **Family/parenting knowledge:** Are there parenting advice datasets? Recipe datasets (RecipeNLG)?
3. **Social media datasets:** Social media post datasets, engagement analysis data, brand voice examples
4. **Tech support datasets:** Are there ELI5-style tech explanation datasets?
5. **Emotional support:** EmpatheticDialogues, counseling conversation datasets
6. **Synthetic:** Use Gemini to generate Mischief-voice family conversations, social media coaching sessions
7. **Safety datasets:** Content moderation datasets, age-appropriate content classification

### Training Pipeline (4-stage)
1. **SFT:** Family conversations, social media coaching, tech help, recipes, scheduling
2. **SimPO:** Helpful/playful vs generic/boring, safe vs unsafe for families
3. **GRPO:** Multi-step reasoning for scheduling conflicts, content strategy
4. **KTO:** Binary feedback from real family user interactions

### Sample Targets
| Category | Count | Description |
|----------|-------|-------------|
| Persona | 500 | Playful in-character family conversations |
| Domain | 500 | Scheduling, social media, recipes, tech help |
| Tool Use | 800 | Calendar ops, file management, screenshots, web search |
| Safety | 500 | Family safety, kid protection, financial boundaries |
| Alignment | 500 | Preference pairs (playful+safe vs generic+unsafe) |
| Voice | 200 | Short, warm, family-friendly verbal responses |
| **Total** | **3000** | |

## Evaluation

### Benchmarks to Research
1. **Conversational quality benchmarks** — How do we measure conversational warmth and helpfulness?
2. **Task completion benchmarks** — Can Mischief correctly schedule a week of meals given dietary constraints?
3. **Safety benchmarks** — ToxiGen, RealToxicityPrompts filtered for family context
4. **Social media quality** — How do we evaluate post/caption quality?

### Custom Evals
1. **Scheduling accuracy:** Given family constraints, does the schedule work without conflicts?
2. **Social media quality:** Posts have hooks, CTAs, appropriate hashtags, platform-appropriate format
3. **Tech explanation clarity:** Can a non-tech person follow the instructions?
4. **Family safety:** Never suggests age-inappropriate content, protects personal info
5. **Personality:** Consistently playful, warm, protective (frontier model judge)
6. **Emotional tone:** Appropriate emotional response to family situations

## Research Questions
1. What makes a great family AI assistant? What does the research say about trust in family-context AI?
2. Are there benchmarks for social media content quality (engagement prediction)?
3. How do we handle the tension between being playful/mischievous and being responsible/safe?
4. What's the best way to train recipe knowledge without memorizing copyrighted cookbooks?
5. How should Mischief handle conflicts between family members?
6. What existing conversational AI fine-tunes work best at <10B parameters?
7. How do we evaluate "warmth" in AI responses? Is there a metric?
8. Should Mischief have different modes for talking to kids vs adults?
