import type { MiddlewareHandler } from 'hono';
import type { UserStore } from '../store/userStore.js';

// Public paths reachable without a token.
function isPublic(method: string, path: string): boolean {
  if (path === '/health') return true;
  if (method === 'POST' && path === '/auth/login') return true;
  return false;
}

export function authMiddleware(users: UserStore): MiddlewareHandler {
  return async (c, next) => {
    if (isPublic(c.req.method, c.req.path)) return next();
    const header = c.req.header('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const token = bearer ?? c.req.query('token');
    const user = token ? users.userForToken(token) : null;
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    c.set('user', user);
    c.set('token', token);
    return next();
  };
}
