export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded-lg ${className}`} />
}
