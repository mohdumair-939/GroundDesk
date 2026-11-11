// Brand mark: a check resting on a baseline ("grounded" answers).
export default function Logo({ className = 'h-8 w-8' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-400 to-brand-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_2px_6px_rgb(79_70_229/0.35)] ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-[55%] w-[55%]" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 11 3.5 3.5 9-9M4 19.5h16" />
      </svg>
    </span>
  )
}
