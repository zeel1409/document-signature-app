export function TextField({ label, error, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? <div className="mb-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</div> : null}
      <input
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        {...props}
      />
      {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : null}
    </label>
  )
}

