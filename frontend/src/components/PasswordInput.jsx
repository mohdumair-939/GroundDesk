import { useId, useState } from 'react'

const EYE = 'M2.04 12.32a1 1 0 0 1 0-.64C3.42 7.51 7.36 4.5 12 4.5c4.64 0 8.57 3.01 9.96 7.18a1 1 0 0 1 0 .64C20.58 16.49 16.64 19.5 12 19.5c-4.64 0-8.57-3.01-9.96-7.18ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
const EYE_OFF =
  'M3.98 8.22A10.48 10.48 0 0 0 1.93 12C3.23 16.34 7.24 19.5 12 19.5c.99 0 1.95-.14 2.86-.39M6.23 6.23A10.45 10.45 0 0 1 12 4.5c4.76 0 8.77 3.16 10.07 7.5a10.52 10.52 0 0 1-4.29 5.77M6.23 6.23 3 3m3.23 3.23 3.65 3.65m7.89 7.89L21 21m-3.23-3.23-3.65-3.65m0 0a3 3 0 1 0-4.24-4.24m4.24 4.24L9.88 9.88'

// A password field with an accessible show/hide toggle. Toggling only changes the input type,
// so the typed value and cursor are kept.
export default function PasswordInput({ label, value, onChange, autoComplete = 'current-password', hint, id, ...rest }) {
  const [visible, setVisible] = useState(false)
  const autoId = useId()
  const inputId = id || autoId

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          className="block w-full rounded-md border border-slate-300 bg-white py-2 pl-3 pr-11 text-sm"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={inputId}
          title={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={visible ? EYE_OFF : EYE} />
          </svg>
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </div>
  )
}
