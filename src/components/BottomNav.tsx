import type { AppRoute } from '../hooks/useHashRoute';
import { Icon, type IconName } from './Icon';

interface BottomNavProps {
  route: AppRoute;
  hrefFor: (route: AppRoute) => string;
}

const NAV_ITEMS: Array<{
  route: AppRoute;
  label: string;
  icon: IconName;
}> = [
  { route: 'home', label: 'Inicio', icon: 'home' },
  { route: 'circuit', label: 'Circuito', icon: 'calendar' },
  { route: 'mi-circuito', label: 'Mi zona', icon: 'pin' },
  { route: 'devices', label: 'Equipos', icon: 'battery' },
  { route: 'settings', label: 'Ajustes', icon: 'settings' },
];

export function BottomNav({ route, hrefFor }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map((item) => {
          const active = route === item.route;
          return (
            <a
              key={item.route}
              className={`nav-link${active ? ' is-active' : ''}`}
              href={hrefFor(item.route)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={23} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
