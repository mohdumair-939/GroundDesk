import { motion } from 'motion/react'
import { BookOpen, MessageSquare, Route } from 'lucide-react'
import Logo from './Logo'
import { EASE, fadeUp, stagger } from '../motion'

const STEPS = [
  { Icon: MessageSquare, title: 'Describe the problem', text: 'Employees raise a ticket in plain language.' },
  { Icon: BookOpen, title: 'Get grounded steps', text: 'Answers come only from the knowledge base, with sources. No match, no guess.' },
  { Icon: Route, title: 'Route to the right team', text: 'Unsolved tickets go to a technician by clear, explainable rules.' },
]

// Two-column shell for the signed-out pages: product story on the left, the form on the right.
export default function AuthLayout({ children }) {
  return (
    <div className="grid grid-cols-1 min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Slow-moving light; stops under reduced motion. */}
        <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[70%] w-[80%] animate-drift rounded-full bg-brand-600/30 blur-3xl" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-[60%] w-[70%] animate-drift rounded-full bg-sky-500/15 blur-3xl [animation-delay:-11s]"
          aria-hidden="true"
        />
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.05] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" aria-hidden="true">
          <defs>
            <pattern id="auth-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M36 0H0v36" fill="none" stroke="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>

        <div className="relative flex items-center gap-3">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">GroundDesk</span>
        </div>

        <motion.div className="relative max-w-md" variants={stagger(0.08, 0.1)} initial="hidden" animate="show">
          <motion.p variants={fadeUp} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            AI-assisted IT service desk
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-[2.6rem] leading-[1.08] font-semibold tracking-tight">
            IT support that answers from{' '}
            <span className="bg-linear-to-r from-brand-300 to-sky-300 bg-clip-text text-transparent">what you actually know.</span>
          </motion.h1>
          <ol className="mt-10 space-y-3">
            {STEPS.map(({ Icon, title, text }) => (
              <motion.li variants={fadeUp} key={title} className="flex gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-brand-300" aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="mt-0.5 block text-sm text-slate-400">{text}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </motion.div>

        <p className="relative text-xs text-slate-500">Internal help desk · Sign-in required</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(99_102_241/0.08),transparent)]" aria-hidden="true" />
        <motion.div
          className="relative w-full max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">GroundDesk</span>
          </div>
          {children}
        </motion.div>
      </main>
    </div>
  )
}
