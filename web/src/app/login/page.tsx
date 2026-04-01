'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden bg-black">
      {/* Video background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          poster="/creatures/vortex-1.jpg"
        >
          <source src="/videos/login-bg2.mp4" type="video/mp4" />
        </video>
        {/* Top and bottom fade to black — no vignette, let the art breathe */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
      </div>

      {/* Grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Navigation — matches meetyourkin.com nav */}
      <nav className="relative z-20 w-full px-6 sm:px-10 lg:px-16 py-6 sm:py-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="font-display text-xl sm:text-2xl font-extrabold tracking-tight"
            style={{
              color: '#ffd700',
              textShadow: '0 0 20px rgba(255,215,0,0.3)',
            }}
          >
            KIN
          </span>
        </Link>
        <div className="hidden sm:flex items-center gap-8">
          <Link
            href="https://www.meetyourkin.com/#features"
            className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-white/35 transition-colors duration-300 hover:text-white"
          >
            Features
          </Link>
          <Link
            href="https://www.meetyourkin.com/#genesis-six"
            className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-white/35 transition-colors duration-300 hover:text-white"
          >
            Genesis Six
          </Link>
          <Link
            href="https://www.meetyourkin.com/#how-it-works"
            className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-white/35 transition-colors duration-300 hover:text-white"
          >
            How It Works
          </Link>
          <Link
            href="https://www.meetyourkin.com/#mint"
            className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-white/35 transition-colors duration-300 hover:text-white"
          >
            Mint
          </Link>
          <Link
            href="https://www.meetyourkin.com/#about"
            className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-white/35 transition-colors duration-300 hover:text-white"
          >
            About
          </Link>
        </div>
      </nav>

      {/* Hero Content — centered, bold, matches meetyourkin.com */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        {/* Big title — matches meetyourkin.com hero style */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1
            className="font-display font-extrabold uppercase leading-[0.9] tracking-[-0.04em] text-white"
            style={{
              fontSize: 'clamp(4rem, 10vw, 9rem)',
            }}
          >
            Meet Your
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #00f0ff 0%, #ff00aa 50%, #ffd700 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              KIN
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-lg text-white/70 leading-relaxed"
          style={{ fontSize: 'clamp(1rem, 1.8vw, 1.25rem)' }}
        >
          Your AI companion that grows with you. Sign in to begin.
        </motion.p>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 w-full max-w-sm"
        >
          <div className="rounded-[24px] border border-white/[0.15] bg-white/[0.03] backdrop-blur-[20px] p-8 sm:p-10">
            {/* Telegram Login Widget */}
            <div className="mb-6 flex justify-center">
              <TelegramLoginButton
                onAuth={(token, user) => {
                  login(token, user);
                  router.push('/onboard');
                }}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/25">
                or
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Primary CTA — magenta fill, matches meetyourkin.com */}
            <a
              href="https://t.me/KinCompanionBot"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-center gap-2.5 rounded-full px-8 py-3.5 font-display text-sm font-medium uppercase tracking-wide text-white transition-all duration-400"
              style={{
                background: '#ff00aa',
                boxShadow: '0 0 20px rgba(255,0,170,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(255,255,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ff00aa';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(255,0,170,0.2)';
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Open in Telegram
            </a>

            {/* Secondary CTA — cyan outline, matches meetyourkin.com */}
            <a
              href="https://www.meetyourkin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border px-8 py-3.5 font-display text-sm font-medium uppercase tracking-wide transition-all duration-400"
              style={{
                borderColor: '#00f0ff',
                color: '#00f0ff',
                boxShadow: '0 0 20px rgba(0,240,255,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#00f0ff';
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0,240,255,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#00f0ff';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,240,255,0.1)';
              }}
            >
              Learn More
            </a>
          </div>

          {/* Help text */}
          <p className="mt-6 text-center text-xs text-white/25">
            Don&apos;t have Telegram?{' '}
            <a
              href="https://telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan underline underline-offset-2 hover:text-cyan/80 transition-colors"
            >
              Download it free
            </a>
          </p>
        </motion.div>
      </div>

      {/* Footer strip — minimal, matches meetyourkin.com */}
      <div className="relative z-10 w-full border-t border-white/10 px-6 sm:px-10 lg:px-16 py-6 flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/20">
          KR8TIV 2025
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/terms"
            className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/20 transition-colors hover:text-white/50"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-white/20 transition-colors hover:text-white/50"
          >
            Privacy
          </Link>
        </div>
      </div>
    </main>
  );
}
