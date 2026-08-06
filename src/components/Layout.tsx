import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/new', label: 'Analyze Film' },
  { to: '/roster', label: 'Roster' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-emerald-900/60 bg-[#0d1a15]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight text-emerald-50">
            <span className="text-2xl">🏈</span>
            <span>Flag Film Analyzer</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-900/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
      <footer className="text-center text-xs text-emerald-200/40 py-4">
        All data stays in this browser. Video is processed locally; only sampled frames are sent to Anthropic for analysis.
      </footer>
    </div>
  );
}
