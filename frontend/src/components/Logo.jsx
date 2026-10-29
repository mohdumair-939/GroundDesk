// Brand mark: a check resting on a baseline ("grounded" answers).
export default function Logo({ tone = 'dark' }) {
  const tile = tone === 'light' ? 'bg-white text-brand-900' : 'bg-brand-800 text-white'
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${tile}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="h-4 w-4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 11 3.5 3.5 9-9M4 19.5h16" />
      </svg>
    </span>
  )
}
