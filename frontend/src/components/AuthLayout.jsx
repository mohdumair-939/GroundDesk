import { ROLE_COLORS } from '../colors'
import Logo from './Logo'

const STEPS = [
  ['Describe the problem', 'Employees raise a ticket in plain language.'],
  ['Get grounded steps', 'Answers come only from the knowledge base, with sources. No match, no guess.'],
  ['Route to the right team', 'Unsolved tickets go to a technician by clear, explainable rules.'],
]

// Two-column shell for the signed-out pages: product context on the left, the form on the right.
// The side panel takes the colour of the role being signed in to.
export default function AuthLayout({ role = 'employee', children }) {
  const c = ROLE_COLORS[role]
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className={`relative hidden flex-col justify-between overflow-hidden p-12 text-white transition-colors duration-300 lg:flex ${c.panel}`}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.08]" aria-hidden="true">
          <defs>
            <pattern id="auth-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0v32" fill="none" stroke="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>

        <svg className="pointer-events-none absolute -right-16 -bottom-16 h-[22rem] w-[22rem]" viewBox="0 0 220 220" aria-hidden="true">
          <circle cx="160" cy="60" r="44" fill={c.shapes[0]} />
          <path d="M20 220V130a90 90 0 0 1 90 90Z" fill={c.shapes[2]} />
          <rect x="110" y="120" width="100" height="100" rx="8" fill={c.shapes[1]} />
          <path d="M110 120h50a50 50 0 0 1-50 50Z" fill="#fff" opacity="0.9" />
          <circle cx="60" cy="80" r="10" fill="#fff" />
        </svg>

        <div className="relative flex items-center gap-2.5">
          <Logo tone="light" />
          <span className="text-[15px] font-semibold tracking-tight text-white">GroundDesk</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-serif text-[2.75rem] leading-[1.05] text-white">
            IT support that answers from <em className={c.accent}>what you actually know.</em>
          </h1>
          <ol className="mt-10 space-y-5">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[11px] font-semibold ${c.ink}`}>
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className={`mt-0.5 block text-sm ${c.sub}`}>{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className={`relative text-xs ${c.sub} opacity-80`}>Internal help desk · Sign-in required</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className={`absolute inset-x-0 top-0 h-1.5 transition-colors duration-300 lg:hidden ${c.panel}`} aria-hidden="true" />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-stone-900">GroundDesk</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
