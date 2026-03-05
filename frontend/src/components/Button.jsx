export function Button({ variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
      : variant === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-500'
        : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'

  return <button className={`${base} ${styles} ${className}`} {...props} />
}

