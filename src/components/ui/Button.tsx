import type React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const styles: Record<string, React.CSSProperties> = {
  base: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, fontFamily: 'var(--font-family)', fontWeight: 700,
    border: 'none', cursor: 'pointer', transition: 'all 160ms ease',
    whiteSpace: 'nowrap', userSelect: 'none',
  },
  primary: {
    background: 'linear-gradient(180deg, #f07a2a 0%, #c15508 100%)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(232, 103, 10, 0.32)',
    border: '1px solid rgba(180, 79, 6, 0.4)',
  },
  secondary: {
    background: 'linear-gradient(180deg, #fbfdfb 0%, #edf5f3 100%)',
    color: 'var(--color-green-deep)',
    border: '1px solid var(--color-border-strong)',
    boxShadow: '0 2px 6px rgba(120, 60, 10, 0.07)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'linear-gradient(180deg, #e03428 0%, #9b1b12 100%)',
    color: '#fff',
    border: '1px solid rgba(155, 27, 18, 0.4)',
    boxShadow: '0 4px 14px rgba(180, 35, 24, 0.28)',
  },
  sm: { height: 32, padding: '0 12px', fontSize: 12, borderRadius: 10 },
  md: { height: 40, padding: '0 18px', fontSize: 14, borderRadius: 'var(--radius-sm)' },
  lg: { height: 48, padding: '0 24px', fontSize: 15, borderRadius: 'var(--radius-sm)' },
  disabled: { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' },
}

export default function Button({
  variant = 'primary', size = 'md', loading = false,
  icon, iconRight, children, disabled, style, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...styles.base,
        ...styles[variant],
        ...styles[size],
        ...(disabled || loading ? styles.disabled : {}),
        ...style,
      }}
    >
      {loading
        ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
        : icon}
      {children}
      {!loading && iconRight}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  )
}
