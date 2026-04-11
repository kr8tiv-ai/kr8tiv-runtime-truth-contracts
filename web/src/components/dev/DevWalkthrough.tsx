'use client';

// ============================================================================
// DevWalkthrough — TEMPORARY dev-only step-by-step walkthrough overlay.
// Shows every step of every process with mock data and a "Next Step" button.
// Delete this file and its import when done testing.
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  route: string;
  mockData: string;
  process: string;
  apiCalls: string[];
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'landing',
    title: '1. Landing Page',
    description: 'Public marketing page — Hero, companion showcase, pricing, FAQ. User arrives here from meetyourkin.com.',
    route: '/',
    mockData: 'Static content — no API calls. PRICING_TIERS loaded from constants.ts.',
    process: 'VISITOR FLOW',
    apiCalls: [],
  },
  {
    id: 'login',
    title: '2. Login / Auth',
    description: 'Multi-provider auth: Google OAuth, X/Twitter PKCE, Solana wallet signature, email/password, Telegram. In dev mode, use the dev-login button.',
    route: '/login',
    mockData: 'Dev login creates user with telegramId=12345678, tier=free, onboarding=complete.',
    process: 'AUTH FLOW',
    apiCalls: ['POST /auth/dev-login → JWT token + user object', 'Cookie: kin_token set via js-cookie'],
  },
  {
    id: 'dashboard',
    title: '3. Dashboard Overview',
    description: 'Main hub — shows active companion, recent conversations, quick stats, and health status cards.',
    route: '/dashboard',
    mockData: 'GET /kin/status → companion name, personality traits, mood. GET /conversations → recent chats.',
    process: 'DASHBOARD INIT',
    apiCalls: ['GET /kin/status', 'GET /conversations?limit=5', 'GET /health'],
  },
  {
    id: 'chat',
    title: '4. Chat Interface',
    description: 'Real-time chat with your KIN companion. WebSocket streaming, message history, voice input toggle. Two-brain routing: local Ollama → frontier supervisor.',
    route: '/dashboard/chat',
    mockData: 'Messages rendered from GET /conversations/:id/messages. New messages via POST /chat with SSE streaming.',
    process: 'CHAT FLOW',
    apiCalls: ['GET /conversations', 'POST /conversations (create new)', 'POST /chat → SSE stream', 'GET /conversations/:id/messages'],
  },
  {
    id: 'companion',
    title: '5. Companion Config',
    description: 'View and customize your KIN companion — name, personality traits, specializations, avatar. 6 archetypes: Cipher, Mischief, Vortex, Forge, Aether, Catalyst.',
    route: '/dashboard/companion',
    mockData: 'GET /companions → 6 archetype definitions. GET /user/companions → user\'s active companion with config.',
    process: 'COMPANION MGMT',
    apiCalls: ['GET /companions', 'GET /user/companions', 'PUT /user/companions/:id (update config)'],
  },
  {
    id: 'soul',
    title: '6. Soul Garden (3D)',
    description: 'Three.js 3D visualization of personality traits. GLB models with post-processing effects. Drift detection shows personality deviation from baseline.',
    route: '/dashboard/soul',
    mockData: 'GET /kin/soul → trait vectors (curiosity, empathy, wit, depth, warmth). Drift score computed client-side.',
    process: 'SOUL VISUALIZATION',
    apiCalls: ['GET /kin/soul', 'GET /kin/drift-status'],
  },
  {
    id: 'collection',
    title: '7. NFT Collection',
    description: 'Solana NFT minting via Metaplex Candy Machine. Genesis tiers: Egg, Hatchling, Elder. Mint page with wallet connect.',
    route: '/dashboard/collection',
    mockData: 'GET /nft/collection → mint counts, floor prices. Candy Machine addresses from env vars.',
    process: 'NFT FLOW',
    apiCalls: ['GET /nft/collection', 'POST /nft/mint (Solana TX)'],
  },
  {
    id: 'canvas',
    title: '8. Canvas Studio',
    description: 'AI-assisted code generation with split-pane editor. Live preview in sandboxed iframe. Device toggle (mobile/tablet/desktop).',
    route: '/dashboard/canvas',
    mockData: 'GET /canvas/projects → user projects. POST /canvas/generate → SSE code stream.',
    process: 'CANVAS FLOW',
    apiCalls: ['GET /canvas/projects', 'POST /canvas/generate (SSE)', 'PUT /canvas/projects/:id'],
  },
  {
    id: 'memories',
    title: '9. Memories',
    description: 'Chronological timeline of encrypted semantic memories. ZK encryption: AES-256-GCM + PBKDF2. API never sees plaintext.',
    route: '/dashboard/memories',
    mockData: 'GET /memories?sort=desc&limit=20 → encrypted memory entries. Decrypted client-side.',
    process: 'MEMORY FLOW',
    apiCalls: ['GET /memories', 'POST /memories (create)', 'DELETE /memories/:id'],
  },
  {
    id: 'family',
    title: '10. Family System',
    description: 'Multi-user households with invite codes. COPPA-safe child accounts with age-bracket guardrails. Shared memories between family members.',
    route: '/dashboard/family',
    mockData: 'GET /family → group info, members. POST /family/create → new group with invite code.',
    process: 'FAMILY FLOW',
    apiCalls: ['GET /family', 'POST /family/create', 'POST /family/invite', 'POST /family/child-account'],
  },
  {
    id: 'skills',
    title: '11. Skills Marketplace',
    description: 'Built-in skills (calculator, weather, web search, reminders) + community skills with approval gates. Skill router uses RegExp triggers.',
    route: '/dashboard/skills',
    mockData: 'GET /skills → builtin + installed skills. GET /skills/marketplace → community skills.',
    process: 'SKILLS FLOW',
    apiCalls: ['GET /skills', 'GET /skills/mine', 'POST /skills/install/:id'],
  },
  {
    id: 'billing',
    title: '12. Billing & Tiers',
    description: 'Stripe subscription management. Tiers: Free → Hatchling ($9/mo) → Elder ($29/mo) → Hero ($99/mo). Feature gates per tier.',
    route: '/dashboard/billing',
    mockData: 'GET /billing/status → current plan, usage. Stripe checkout via POST /billing/checkout.',
    process: 'BILLING FLOW',
    apiCalls: ['GET /billing/status', 'POST /billing/checkout', 'POST /billing/portal (Stripe portal)'],
  },
  {
    id: 'health',
    title: '13. Health Dashboard',
    description: 'System health monitoring — API latency, DB size, Ollama status, memory usage. Watchdog + heartbeat recovery system.',
    route: '/dashboard/health',
    mockData: 'GET /health → full system diagnostics. Polls every 30s.',
    process: 'HEALTH MONITORING',
    apiCalls: ['GET /health', 'GET /health/detailed'],
  },
  {
    id: 'settings',
    title: '14. Settings',
    description: 'User preferences — display name, language, tone, notification preferences. Data export (GDPR). Account deletion.',
    route: '/dashboard/settings',
    mockData: 'GET /user/preferences → current settings. PUT /user/preferences → update.',
    process: 'SETTINGS FLOW',
    apiCalls: ['GET /user/preferences', 'PUT /user/preferences', 'POST /user/export'],
  },
  {
    id: 'admin',
    title: '15. Admin Panel (Hero only)',
    description: 'Mission Control — user stats, support tickets, feature requests, system metrics. Only accessible to hero-tier users.',
    route: '/dashboard/admin',
    mockData: 'GET /admin/stats → user counts, message volume, revenue. Requires hero tier.',
    process: 'ADMIN FLOW',
    apiCalls: ['GET /admin/stats', 'GET /admin/support-tickets', 'GET /admin/feature-requests'],
  },
];

export function DevWalkthrough() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Sync step with current route
  useEffect(() => {
    const idx = WALKTHROUGH_STEPS.findIndex(s => s.route === pathname);
    if (idx >= 0 && idx !== currentStep) {
      setCurrentStep(idx);
    }
  }, [pathname, currentStep]);

  const step = WALKTHROUGH_STEPS[currentStep];
  const totalSteps = WALKTHROUGH_STEPS.length;

  const goToStep = useCallback((idx: number) => {
    setCurrentStep(idx);
    router.push(WALKTHROUGH_STEPS[idx].route);
  }, [router]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) goToStep(currentStep + 1);
  }, [currentStep, totalSteps, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-magenta/90 px-4 py-2 text-xs font-mono text-white shadow-lg backdrop-blur-md hover:bg-magenta transition-colors"
      >
        <span>DEV</span>
        <span className="opacity-60">{currentStep + 1}/{totalSteps}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[420px] max-h-[80vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a0f]/95 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#0a0a0f]/95 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-magenta/20 border border-magenta/30 px-2 py-0.5 text-[10px] font-mono font-bold text-magenta">
            DEV WALKTHROUGH
          </span>
          <span className="text-[10px] font-mono text-white/40">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
            title="Minimize"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
            title="Close walkthrough"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-magenta to-gold transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step Content */}
      <div className="p-4 space-y-3">
        {/* Process badge + title */}
        <div>
          <span className="text-[10px] font-mono text-gold/70 tracking-widest">
            {step.process}
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">{step.title}</h3>
        </div>

        {/* Description */}
        <p className="text-xs text-white/60 leading-relaxed">{step.description}</p>

        {/* Mock Data */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <span className="text-[10px] font-mono text-cyan-400/70 block mb-1">MOCK DATA</span>
          <p className="text-[11px] text-white/50 font-mono leading-relaxed">{step.mockData}</p>
        </div>

        {/* API Calls */}
        {step.apiCalls.length > 0 && (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[10px] font-mono text-emerald-400/70 block mb-1">API CALLS</span>
            <ul className="space-y-1">
              {step.apiCalls.map((call, i) => (
                <li key={i} className="text-[11px] text-white/50 font-mono">
                  <span className="text-emerald-400/50 mr-1">→</span> {call}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Route */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/30">ROUTE:</span>
          <code className="text-[11px] font-mono text-magenta/70">{step.route}</code>
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 flex items-center justify-between border-t border-white/10 bg-[#0a0a0f]/95 px-4 py-3">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-mono text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>

        {/* Step dots */}
        <div className="flex gap-1">
          {WALKTHROUGH_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentStep
                  ? 'w-4 bg-magenta'
                  : i < currentStep
                    ? 'w-1.5 bg-magenta/30'
                    : 'w-1.5 bg-white/10'
              }`}
              title={WALKTHROUGH_STEPS[i].title}
            />
          ))}
        </div>

        <button
          onClick={nextStep}
          disabled={currentStep === totalSteps - 1}
          className="rounded-lg bg-magenta/20 border border-magenta/30 px-3 py-1.5 text-xs font-mono font-bold text-magenta hover:bg-magenta/30 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
