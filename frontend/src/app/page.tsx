'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: 'brain',
    title: 'Grounded in Real Regulatory Data',
    desc: "DocDuty's AI doesn't guess. It reasons over an actual knowledge base built from CAC, NDPA, FIRS, and other regulatory sources — kept current through automated monitoring, reviewed by a human before anything changes.",
  },
  {
    icon: 'chat',
    title: 'Talk, Don\u2019t Guess',
    desc: 'Tell DocDuty about your business once. It tells you what you\u2019re actually required to have — licenses, policies, registrations — specific to your business, not a generic checklist.',
  },
  {
    icon: 'doc',
    title: 'Real Compliance Documents',
    desc: 'Invoices, contracts, employment agreements, privacy policies, business proposals \u2014 correctly calculated and properly formatted, generated the moment you need them.',
  },
  {
    icon: 'bell',
    title: 'Never Miss What Matters',
    desc: 'Recurring compliance deadlines, tracked automatically, with reminders sent before they\u2019re due \u2014 and a Compliance Health Score that tells you honestly where you stand.',
  },
];

const RISKS = [
  {
    icon: 'warning',
    title: 'Fines & Penalties',
    desc: 'Regulatory bodies can and do penalize unregistered or non-compliant businesses. What starts as an oversight can become a real financial cost.',
  },
  {
    icon: 'stop',
    title: 'Business Disruption',
    desc: 'Missing registrations or licenses can mean being shut down, blocked from opening a business bank account, or unable to operate in certain locations at all.',
  },
  {
    icon: 'gavel',
    title: 'Legal Exposure',
    desc: 'Without proper contracts and policies, business owners take on personal risk they never intended \u2014 disputes with clients, staff, or partners with nothing in writing to protect them.',
  },
  {
    icon: 'lock',
    title: 'Lost Opportunities',
    desc: 'Bigger clients, partners, and government contracts routinely require proof of compliance before they\u2019ll even talk to you. Non-compliance quietly closes doors you never see.',
  },
];

const STEPS = [
  { number: '01', title: 'Tell DocDuty about your business', desc: 'A short conversation \u2014 what you do, where you operate, how you\u2019re structured. No forms.' },
  { number: '02', title: 'DocDuty tells you what you\u2019re missing', desc: 'Real requirements, matched to your specific business against actual regulatory data \u2014 not a generic list everyone gets.' },
  { number: '03', title: 'Fix it, right there', desc: 'Generate the document, calculate what you owe, or get a real answer \u2014 all in the same conversation.' },
];

function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    brain: <><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 2a5.5 5.5 0 00-5.5 5.5c0 1.5.6 2.8 1.5 3.8V15a3 3 0 003 3h.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M14.5 2A5.5 5.5 0 0120 7.5c0 1.5-.6 2.8-1.5 3.8V15a3 3 0 01-3 3h-.5" /><path strokeLinecap="round" d="M9.5 18v2a1.5 1.5 0 003 0v-2" /></>,
    chat: <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.5 0-2.91-.32-4.15-.89L3 20l1.05-3.15A7.94 7.94 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    doc: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6l5 5v13a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z" /><path strokeLinecap="round" d="M13 2v6h6M9 13h6M9 17h6" /></>,
    bell: <><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></>,
    warning: <><path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path strokeLinecap="round" d="M12 9v4M12 17h.01" /></>,
    stop: <><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M4.93 4.93l14.14 14.14" /></>,
    gavel: <><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-8.5 8.5a1 1 0 01-1.5 0l-2.5-2.5a1 1 0 010-1.5L10 6M17 6l1-1M11 13l7-7M14 3l7 7M18 3l3 3" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path strokeLinecap="round" d="M8 10V7a4 4 0 018 0v3" /></>,
  };
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen" style={{ background: '#FAFAFA' }}>
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1155 50%, #1a0b2e 100%)' }}
      >
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 75% 25%, rgba(124,58,237,0.5), transparent 55%)' }} />
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 15% 80%, rgba(167,139,250,0.4), transparent 50%)' }} />

        <header className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="font-display font-bold text-lg text-white">DocDuty</span>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#risks" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Why It Matters</a>
            <a href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-white/70 hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Log In</Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#7C3AED', color: 'white' }}>
              Get Started
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen((s) => !s)} className="md:hidden text-white" aria-label="Menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {mobileMenuOpen && (
          <div className="relative md:hidden px-6 pb-6 flex flex-col gap-3">
            <a href="#risks" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/80">Why It Matters</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/80">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/80">How It Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm text-white/80">Pricing</a>
            <Link href="/login" className="text-sm text-white/80">Log In</Link>
            <Link href="/signup" className="text-sm font-semibold text-white">Get Started →</Link>
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-32 grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono mb-6"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#C4B5FD' }}
            >
              <span className="w-1.5 h-1.5 rounded-full ai-thinking-dot" style={{ background: '#A78BFA' }} />
              Compliance Intelligence, Not Guesswork
            </span>
            <h1 className="font-display text-5xl md:text-6xl font-bold mb-6 leading-[1.05] text-white">
              You don&apos;t know<br />what you don&apos;t know.<br />
              <span style={{ color: '#A78BFA' }}>DocDuty does.</span>
            </h1>
            <p className="text-lg mb-10 max-w-md" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Most Nigerian businesses aren&apos;t breaking the rules on purpose — they simply were
              never told what applies to them. That gap is expensive to close later. DocDuty&apos;s
              AI reasons over real regulatory data to tell you exactly what your business is
              missing, before it costs you.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/signup" className="px-6 py-3 rounded-xl text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ background: '#7C3AED', color: 'white' }}>
                Get Started
              </Link>
              <Link href="/login" className="px-6 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>
                Log In
              </Link>
            </div>
            <p className="text-xs mt-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Free to start · AI-grounded compliance analysis · 6 document types
            </p>
          </motion.div>

          <div className="relative h-96 hidden md:block">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="absolute top-0 right-4 w-72 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
              <p className="text-sm text-white">I run a small catering business in Lagos with 3 staff. What do I actually need?</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute top-32 right-0 w-80 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.5 0-2.91-.32-4.15-.89L3 20l1.05-3.15A7.94 7.94 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold" style={{ color: '#1A1A1A' }}>DocDuty Assistant</span>
              </div>
              <p className="text-xs" style={{ color: '#6B7280' }}>Based on CAC and FIRS requirements: you'll need a registered business name, PAYE registration for your staff, and food handling permits. Want me to check the details?</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute top-64 right-8 w-64 p-4 rounded-2xl flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.2)' }}>
                <svg className="w-4 h-4" fill="none" stroke="#34D399" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Compliance Health</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Personalized to your business</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The cost of non-compliance — persuasive, risk-forward section */}
      <section id="risks" className="max-w-5xl mx-auto px-6 py-20">
        <div className="max-w-xl mb-12">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#DC2626' }}>Why It Matters</p>
          <h2 className="font-display text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>
            What non-compliance actually costs you
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            It rarely feels urgent — until it is. A missing registration or an overlooked policy
            can quietly become the reason a deal falls through, a client walks away, or a
            regulator gets involved.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {RISKS.map((risk, i) => (
            <motion.div key={risk.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
              className="p-6 rounded-2xl" style={{ background: 'white', border: '1px solid rgba(220,38,38,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(220,38,38,0.08)' }}>
                <span style={{ color: '#DC2626' }}><Icon name={risk.icon} /></span>
              </div>
              <h3 className="font-display font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>{risk.title}</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>{risk.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="p-6 rounded-2xl flex items-center justify-between flex-wrap gap-4" style={{ background: '#F3EFFD' }}>
          <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
            Compliance isn&apos;t paperwork for its own sake — it&apos;s what keeps your business
            operating, fundable, and trusted.
          </p>
          <Link href="/signup" className="px-5 py-2.5 rounded-xl text-sm font-semibold shrink-0" style={{ background: '#7C3AED', color: 'white' }}>
            Check Your Status
          </Link>
        </div>
      </section>

      <section id="features" className="py-20" style={{ background: '#F3EFFD' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mb-12">
            <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#7C3AED' }}>Features</p>
            <h2 className="font-display text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>Not another document generator</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>DocDuty is built around one question: what does your specific business actually need to be legally compliant — and does it have that yet?</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
                className="p-6 rounded-2xl" style={{ background: 'white', border: '1px solid rgba(124,58,237,0.10)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: '#F3EFFD' }}>
                  <span style={{ color: '#7C3AED' }}><Icon name={f.icon} /></span>
                </div>
                <h3 className="font-display font-semibold mb-1.5" style={{ color: '#1A1A1A' }}>{f.title}</h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#7C3AED' }}>How It Works</p>
        <h2 className="font-display text-3xl font-bold mb-12" style={{ color: '#1A1A1A' }}>Find out what you're missing, before it costs you</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <div key={step.number}>
              <p className="font-display text-4xl font-bold mb-3" style={{ color: '#C4B5FD' }}>{step.number}</p>
              <h3 className="font-display font-semibold mb-2" style={{ color: '#1A1A1A' }}>{step.title}</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="py-20" style={{ background: '#F3EFFD' }}>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#7C3AED' }}>Our Mission</p>
            <h2 className="font-display text-3xl font-bold mb-5" style={{ color: '#1A1A1A' }}>
              Being compliant is what lets a small business become a real business.
            </h2>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              The businesses that grow — that raise funding, win bigger contracts, and survive
              scrutiny — are the ones that got compliance right early. It builds trust with
              customers, protects owners personally, and keeps doors open that non-compliance
              quietly closes.
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              DocDuty exists to make that achievable without a consultant on retainer. Every
              answer is grounded in real regulatory data from CAC, NDPA, and FIRS — matched to
              your specific business. Every rate we calculate is admin-verified and versioned,
              never guessed. Every detected regulatory change is reviewed by a human before it
              reaches you. Intelligence, with real accountability behind it.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl" style={{ background: 'white' }}>
              <p className="font-display text-2xl font-bold mb-1" style={{ color: '#7C3AED' }}>6</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>Document types generated automatically</p>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: 'white' }}>
              <p className="font-display text-2xl font-bold mb-1" style={{ color: '#7C3AED' }}>5</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>Nigerian tax & fee calculators built in</p>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: 'white' }}>
              <p className="font-display text-2xl font-bold mb-1" style={{ color: '#7C3AED' }}>1</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>AI trained on your specific compliance situation</p>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: 'white' }}>
              <p className="font-display text-2xl font-bold mb-1" style={{ color: '#7C3AED' }}>0</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>Guessed numbers — every rate is human-verified</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#7C3AED' }}>Pricing</p>
        <h2 className="font-display text-3xl font-bold mb-10" style={{ color: '#1A1A1A' }}>Start free. Upgrade when you need more.</h2>
        <div className="grid md:grid-cols-2 gap-6 text-left">
          <div className="p-8 rounded-2xl" style={{ background: 'white', border: '1px solid rgba(124,58,237,0.10)' }}>
            <p className="font-display text-lg font-semibold mb-1" style={{ color: '#1A1A1A' }}>Free</p>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>5 documents per month, all calculators, deadline tracking, compliance health score.</p>
            <Link href="/signup" className="text-sm font-semibold" style={{ color: '#7C3AED' }}>Get started →</Link>
          </div>
          <div className="p-8 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, #1a0b2e, #2d1155)' }}>
            <p className="font-display text-lg font-semibold mb-1">Subscription</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>Unlimited documents, white-label branding, agency multi-client management.</p>
            <Link href="/signup" className="text-sm font-semibold" style={{ color: '#A78BFA' }}>Get started →</Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-bold mb-4" style={{ color: '#1A1A1A' }}>Don&apos;t wait to find out the hard way</h2>
        <p className="text-sm mb-8" style={{ color: '#6B7280' }}>Free to start. No card required.</p>
        <Link href="/signup" className="inline-block px-8 py-3.5 rounded-xl text-sm font-semibold" style={{ background: '#7C3AED', color: 'white' }}>
          Create Your Account
        </Link>
      </section>

      <footer style={{ background: '#1a0b2e' }}>
        <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <span className="font-display font-bold text-lg text-white block mb-3">DocDuty</span>
            <p className="text-xs max-w-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              AI-grounded compliance intelligence and document automation for Nigerian businesses.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-white">Product</p>
            <div className="flex flex-col gap-2">
              <a href="#features" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Features</a>
              <a href="#pricing" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Pricing</a>
              <a href="#how-it-works" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>How It Works</a>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-white">Company</p>
            <div className="flex flex-col gap-2">
              <a href="#about" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>About</a>
              <Link href="/login" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Log In</Link>
              <Link href="/signup" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Sign Up</Link>
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            DocDuty is not a substitute for licensed legal or accounting advice.
          </p>
        </div>
      </footer>
    </main>
  );
}
