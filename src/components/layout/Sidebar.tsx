import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';
import { APP_AUTHOR_LINK, APP_NAME, APP_VERSION } from '@/constants/app.constants';
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
      className={`hidden lg:flex flex-col border-r border-border bg-card h-screen sticky top-0 transition-[width] duration-200 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* 顶部：Logo + 名称 + 折叠按钮 */}
      <div className="border-b border-border p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <img src="/logo-128.png" alt={APP_NAME} className="w-8 h-8 rounded" />
            <button type="button" onClick={toggle} className="p-1 rounded hover:bg-muted/20">
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <img src="/logo-128.png" alt={APP_NAME} className="w-7 h-7 shrink-0 rounded" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{APP_NAME}</div>
              <div className="text-[10px] text-muted-foreground">v{APP_VERSION}</div>
            </div>
            <button type="button" onClick={toggle} className="p-1 rounded hover:bg-muted/20 shrink-0">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 导航 */}
      <nav className="flex-1 flex flex-col gap-1 px-2 pt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md text-sm transition-colors ${
                collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
              } ${
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

      {/* 底部：作者信息 */}
      <div className="p-2 text-xs text-muted-foreground border-t border-border">
        {collapsed ? (
          <a
            href={APP_AUTHOR_LINK}
            className="block text-center hover:text-primary"
            target="_blank"
            rel="noreferrer"
            title={`v${APP_VERSION} By Tiger`}
          >
            T
          </a>
        ) : (
          <div className="px-1">
            By{' '}
            <a href={APP_AUTHOR_LINK} className="hover:text-primary" target="_blank" rel="noreferrer">
              Tiger
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
