'use client';

import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

function JoinContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [stored, setStored] = useState(false);

  useEffect(() => {
    if (ref && ref.trim().length > 0) {
      localStorage.setItem('kin-referral-code', ref.trim());
      setStored(true);
    }
  }, [ref]);

  const hasValidRef = ref && ref.trim().length > 0;

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 overflow-hidden">
        {/* Background creature image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/creatures/vortex-1.jpg"
            alt=""
            fill
            className="object-cover object-center opacity-20"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black" />
        </div>

        {/* Join Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 sm:p-10">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="text-3xl" aria-hidden="true">
                {'\uD83D\uDC19'}
              </span>
              <span
                className="font-display text-2xl font-bold tracking-tight text-cyan"
                style={{
                  textShadow:
                    '0 0 7px rgba(0,240,255,0.6), 0 0 20px rgba(0,240,255,0.4)',
                }}
              >
                KIN
              </span>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
                {hasValidRef
                  ? 'You\u2019ve been invited to KIN'
                  : 'Join KIN'}
              </h1>
              <p className="text-sm text-white/50">
                {hasValidRef
                  ? 'A friend thinks you\u2019d love your own AI companion'
                  : 'Create your AI companion and start your journey'}
              </p>
            </div>

            {/* Referral Perks */}
            {hasValidRef && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mb-8 space-y-3"
              >
                {/* What you get */}
                <div className="rounded-xl border border-cyan/20 bg-cyan/[0.05] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan/10">
                      <span className="text-lg">{'\uD83C\uDF81'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        You get 3 free trial days
                      </p>
                      <p className="text-xs text-white/40">
                        Start exploring KIN at no cost
                      </p>
                    </div>
                  </div>
                </div>

                {/* What your friend gets */}
                <div className="rounded-xl border border-magenta/20 bg-magenta/[0.05] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-magenta/10">
                      <span className="text-lg">{'\uD83D\uDC9C'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Your friend gets 7 free days added
                      </p>
                      <p className="text-xs text-white/40">
                        They earn a week for inviting you
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Confirmation badge */}
            {hasValidRef && stored && (
              <div className="mb-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan/10 border border-cyan/20 px-3 py-1 text-xs text-cyan">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Referral code saved
                </span>
              </div>
            )}

            {/* Get Started Button */}
            <Link
              href="/login"
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-full px-6 py-3',
                'text-base font-semibold text-white transition-all duration-200',
                'bg-cyan shadow-[0_0_20px_rgba(0,240,255,0.3)]',
                'hover:brightness-110 hover:shadow-[0_0_30px_rgba(0,240,255,0.5)]',
              )}
            >
              Get Started
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>

            {/* Subtext */}
            <p className="mt-4 text-center text-xs text-white/30">
              Sign in with Telegram to claim your{' '}
              {hasValidRef ? 'referral bonus' : 'account'}
            </p>
          </div>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-white/30 transition-colors hover:text-white/60"
            >
              &larr; Back to home
            </Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
