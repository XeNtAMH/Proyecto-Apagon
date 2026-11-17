import { useCallback, useEffect, useState } from 'react';

export type AppRoute = 'home' | 'circuit' | 'devices' | 'settings' | 'mi-circuito';

const ROUTE_HASHES: Record<AppRoute, string> = {
  home: '#/',
  circuit: '#/circuito',
  devices: '#/dispositivos',
  settings: '#/ajustes',
  'mi-circuito': '#/mi-circuito',
};

function routeFromHash(hash: string): AppRoute {
  if (hash.startsWith('#/mi-circuito')) return 'mi-circuito';
  if (hash.startsWith('#/circuito')) return 'circuit';
  if (hash.startsWith('#/dispositivos')) return 'devices';
  if (hash.startsWith('#/ajustes')) return 'settings';
  return 'home';
}

export function useHashRoute(): {
  route: AppRoute;
  navigate: (route: AppRoute) => void;
  hrefFor: (route: AppRoute) => string;
} {
  const [route, setRoute] = useState<AppRoute>(() =>
    routeFromHash(window.location.hash),
  );

  useEffect(() => {
    const handleHashChange = () =>
      setRoute(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute) => {
    const hash = ROUTE_HASHES[nextRoute];
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      setRoute(nextRoute);
    }
  }, []);

  const hrefFor = useCallback(
    (nextRoute: AppRoute) => ROUTE_HASHES[nextRoute],
    [],
  );

  return { route, navigate, hrefFor };
}
