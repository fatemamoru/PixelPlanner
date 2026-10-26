import { NavLink, Outlet } from 'react-router-dom';
import { Sparkles, CalendarDays, Bookmark, BarChart3, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from './Logo';
import { NotificationRegion } from './NotificationRegion';
import { useServices } from '../app/AppContext';
import styles from './AppShell.module.css';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

// Primary navigation destinations, each reachable in one click (Req 10.1).
const NAV_ITEMS: NavItem[] = [
  { to: '/create', label: 'Create', Icon: Sparkles },
  { to: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { to: '/saved', label: 'Saved', Icon: Bookmark },
  { to: '/tracking', label: 'Tracking', Icon: BarChart3 },
  { to: '/services', label: 'Services', Icon: Briefcase },
];

export function AppShell() {
  const { usingFallback } = useServices();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Logo />
      </header>

      <nav className={styles.nav} aria-label="Primary">
        <ul className={styles.navList}>
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
                // Persistent active-state indication for assistive tech (Req 10.2).
                aria-current={undefined}
              >
                {({ isActive }) => (
                  <span className={styles.navInner} aria-current={isActive ? 'page' : undefined}>
                    <Icon size={20} aria-hidden={true} />
                    <span>{label}</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className={styles.main} id="main-content">
        {usingFallback && (
          <p className={styles.fallbackNotice} role="status">
            Heads up: browser storage is unavailable, so your data will not be saved after you
            close the app.
          </p>
        )}
        <Outlet />
      </main>

      <NotificationRegion />
    </div>
  );
}
