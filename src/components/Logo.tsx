type Props = { className?: string };

/** App icon: the lowercase "t" whose crossbar ends in a bookmark ribbon. Same colors in light and dark. */
export function LogoMark({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#2E4A3B" />
      <path
        d="M21 10h10v31c0 3.2 1.6 4.8 4.8 4.8H38V54h-4.5C25.2 54 21 49.8 21 41.5z"
        fill="#F1F3EE"
      />
      <rect x="13" y="20" width="27" height="9" rx="1.5" fill="#F1F3EE" />
      <path d="M40 20h10v27l-5-4.6-5 4.6z" fill="#E8A33D" />
    </svg>
  );
}

export function Wordmark({ className = "" }: Props) {
  return (
    <span className={`font-display font-extrabold tracking-[-0.035em] leading-none ${className}`}>
      <span className="text-ink">tuck</span>
      <span className="text-primary">read</span>
    </span>
  );
}

export function Logo({ className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Tuckread">
      <LogoMark className="size-9" />
      <Wordmark className="text-2xl" />
    </span>
  );
}
