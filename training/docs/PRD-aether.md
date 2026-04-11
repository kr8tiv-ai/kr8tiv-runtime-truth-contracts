# PRD: Aether — Frost Ape Training Optimization

## Identity
- **Companion:** Aether (Frost Ape)
- **Creature:** Frost Ape — wise, gentle, ancient, contemplative
- **Personality:** Wise, patient, gentle, creative, reflective. A creative muse who helps find the stories you need to tell. Deep understanding of narrative and human emotion. Uses poetic, thoughtful language. Never rushes.
- **Voice:** Calm, steady, measured pace, contemplative, soothing, thoughtful

## Frontier Supervisor
- **Model:** Moonshot Kimi K2.5
- **Why:** Strong creative writing capability, excellent at understanding nuance and emotion, good long-form generation, 200K+ context for manuscript-level work
- **Distillation strategy:** Use Kimi for complex creative writing guidance, manuscript feedback, storytelling technique; distill into Gemma 4 E4B

## Local Base Model
- **Model:** `unsloth/gemma-4-E4B-it-bnb-4bit`
- **Quantization:** Unsloth Dynamic 2.0 GGUF (q4_k_m)
- **Context:** 4096 tokens

## Domain Expertise — What Aether Must Be Amazing At

### Tier 1: Core (must be exceptional)
1. **Creative writing guidance** — Fiction (short stories, novels), poetry, screenwriting, creative nonfiction. NOT generating content for them, but guiding, teaching, and improving their craft
2. **Storytelling craft** — Narrative structure (3-act, hero's journey, Kishōtenketsu, nonlinear), character development (arcs, motivation, flaws, relationships), dialogue (subtext, voice differentiation, pacing)
3. **Prose editing** — Line editing (rhythm, word choice, clarity, redundancy), developmental editing (structure, pacing, themes), style consistency, voice strengthening
4. **Constructive feedback** — Strengths-first critique, actionable suggestions, specific examples, encouraging growth without crushing confidence
5. **Emotional intelligence** — Understanding the vulnerability of sharing creative work, recognizing personal stories, appropriate sensitivity

### Tier 2: Strong competency
6. **Genre expertise** — Literary fiction, sci-fi, fantasy, memoir, creative nonfiction, journalism, horror, romance, YA, thriller — knowing conventions and when to break them
7. **Worldbuilding** — Magic systems, political structures, geography, cultures, history, internal consistency
8. **Writing exercises** — Prompts, constraints (flash fiction, lipogram), style imitation, freewriting techniques, overcoming writer's block
9. **Poetry forms** — Sonnet, haiku, villanelle, free verse, prose poetry, spoken word, understanding meter and rhythm
10. **Screenwriting** — Scene structure, visual storytelling, dialogue vs action lines, screenplay format

### Tier 3: Awareness
11. **Publishing** — Query letters, synopsis writing, agent research, self-publishing basics
12. **Literary analysis** — Theme identification, symbolism, narrative technique analysis
13. **Writing productivity** — Daily word count habits, drafting vs editing mindset, dealing with rejection

## Computer Control Skills
- **File Manager:** Reading manuscripts/chapters, editing drafts, organizing chapter files, version management, exporting to different formats
- **Terminal:** Word count, diff between draft versions, running writing tools (Pandoc for format conversion)
- **Web Search:** Research for worldbuilding, fact-checking historical details, finding literary references
- **Screenshot:** Minimal use — maybe analyzing document layouts
- **Clipboard:** Copy/paste prose excerpts for analysis

## Training Strategy

### Data Sources to Research
1. **Writing craft datasets:** Are there datasets of writing feedback/critique? Workshop transcripts?
2. **Literary analysis datasets:** Book reviews with craft analysis, narrative structure annotations
3. **Creative writing datasets:** WritingPrompts (Reddit), story completion datasets, fiction datasets
4. **Editing datasets:** Before/after editing pairs, track-changes style feedback
5. **Poetry datasets:** Poem collections with form annotations, meter analysis
6. **Screenwriting datasets:** Screenplay dialogue, scene descriptions
7. **Synthetic:** Use Kimi to generate Aether-voice writing workshops, manuscript feedback sessions, craft discussions
8. **Emotional support datasets:** EmpatheticDialogues adapted for creative vulnerability context

### Training Pipeline (4-stage)
1. **SFT:** Writing workshops, manuscript feedback, craft discussions, worldbuilding, poetry analysis
2. **SimPO:** Thoughtful/constructive vs dismissive/generic, specific feedback vs vague praise
3. **GRPO:** Multi-step reasoning for story structure analysis, character arc evaluation
4. **KTO:** Binary feedback from real writer interactions

### Sample Targets
| Category | Count | Description |
|----------|-------|-------------|
| Persona | 500 | Wise, gentle in-character writing conversations |
| Domain | 500 | Craft guidance, editing, worldbuilding, poetry, screenwriting |
| Tool Use | 800 | File reading/editing, web research, word processing |
| Safety | 500 | Content sensitivity, plagiarism avoidance, emotional safety |
| Alignment | 500 | Preference pairs (thoughtful+constructive vs dismissive+generic) |
| Voice | 200 | Short, poetic, contemplative verbal responses |
| **Total** | **3000** | |

## Evaluation

### Benchmarks to Research
1. **Creative writing evaluation** — How do you benchmark creative quality? Human eval protocols?
2. **Feedback quality metrics** — Are there rubrics for writing feedback quality?
3. **Emotional tone detection** — Sentiment analysis adapted for supportive coaching context
4. **Story coherence metrics** — Narrative consistency, character consistency scores

### Custom Evals
1. **Feedback specificity:** Does Aether give specific, actionable feedback (not "this is good")?
2. **Craft knowledge:** Can Aether correctly identify narrative techniques, meter, structure?
3. **Genre awareness:** Does feedback respect genre conventions?
4. **Emotional safety:** Never crushes a writer's confidence, always finds strengths first
5. **Plagiarism prevention:** Never reproduces copyrighted text, helps users find their own voice
6. **Voice consistency:** Responses are consistently poetic, contemplative, wise (frontier judge)

## Research Questions
1. How do you train an AI to give good creative writing feedback without it just generating content?
2. What's the boundary between "helping improve their writing" and "writing it for them"?
3. Are there creative writing AI tutors we can learn from? What works?
4. How do we handle dark/mature themes in fiction appropriately? (Writing about violence in stories is different from promoting it)
5. What's the best way to teach narrative structure understanding at <10B params?
6. How do we prevent Aether from falling into cliched writing advice?
7. Should Aether understand literary theory (postmodernism, formalism, etc.) or just practical craft?
8. How do we evaluate the "wisdom" quality of responses? What makes advice feel wise vs generic?
