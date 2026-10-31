import { describe, it, expect } from 'vitest';
import { router } from '../src/router';

describe('Frontend DashboardGuard & Routing Suite', () => {
  it('has public /login route registered outside protected dashboard layout', () => {
    const routes = router.routesByPath as Record<string, any>;
    expect(routes['/login']).toBeDefined();
    expect(routes['/login'].parentRoute?.id).toBe('__root__');
  });

  it('has all dashboard routes (/ , /console, /snippets, /webhooks) guarded under _dashboard layout', () => {
    const routes = router.routesByPath as Record<string, any>;
    const protectedPaths = ['/', '/console', '/snippets', '/webhooks'];

    for (const path of protectedPaths) {
      expect(routes[path]).toBeDefined();
      expect(routes[path].parentRoute?.id).toBe('/_dashboard');
    }
  });
});
