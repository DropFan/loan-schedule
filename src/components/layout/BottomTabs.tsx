import { NavLink } from 'react-router';
import { navItems } from './nav-items';

export function BottomTabs() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex z-50 pb-[env(safe-area-inset-bottom)]">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive ? 'text-primary' : 'text-muted'
            }`
          }
        >
          <item.icon className="w-5 h-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
