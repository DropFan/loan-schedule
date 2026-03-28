import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';
import { APP_VERSION } from '@/constants/app.constants';
import { navItems } from './nav-items';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-border bg-surface h-screen sticky top-0 transition-[width] duration-200 ${
        collapsed ? 'w-12' : 'w-50'
      }`}
    >
      <div className="flex items-center justify-between p-3">
        {!collapsed && (
          <span className="text-sm font-bold truncate">贷款助手</span>
        )}
        <button
          type="button"
          onClick={toggle}
          className="p-1 rounded hover:bg-muted/20"
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted/10'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 text-xs text-muted-foreground border-t border-border">
        {!collapsed && `v${APP_VERSION}`}
      </div>
    </aside>
  );
}
