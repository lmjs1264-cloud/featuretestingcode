import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-emerald-900/50 bg-[#0f1c17] p-4 sm:p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-500',
    secondary: 'bg-emerald-900/60 text-emerald-100 hover:bg-emerald-900',
    ghost: 'bg-transparent text-emerald-200 hover:bg-emerald-900/40',
    danger: 'bg-red-900/60 text-red-100 hover:bg-red-900',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'bad' }) {
  const tones: Record<string, string> = {
    default: 'bg-emerald-900/60 text-emerald-200',
    good: 'bg-emerald-700/40 text-emerald-200',
    bad: 'bg-red-900/40 text-red-200',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-emerald-900/60 bg-[#0b1512] px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-200/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${props.className ?? ''}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-emerald-900/60 bg-[#0b1512] px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-200/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${props.className ?? ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-emerald-900/60 bg-[#0b1512] px-3 py-2 text-sm text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${props.className ?? ''}`}
    />
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 border border-dashed border-emerald-900/50 rounded-xl">
      <p className="text-emerald-100 font-medium">{title}</p>
      {description && <p className="text-emerald-200/50 text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
