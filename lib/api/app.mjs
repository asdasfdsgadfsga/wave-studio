import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { validator } from 'hono/validator';
import { HTTPException } from 'hono/http-exception';
import { handleBooking } from '../booking/api.mjs';
import { handleChat } from '../chat/api.mjs';

export const app = new Hono();

// The same application handles API requests on Pages and local Node.js.
app.use('/api/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
});
app.onError((error, c) => {
  if (error instanceof HTTPException && error.status < 500) {
    return c.json({ error: error.status === 400 ? 'Некорректный JSON.' : 'Некорректный запрос.' }, error.status);
  }
  // Do not expose request bodies, contact details or provider credentials.
  console.error('Wave API request failed');
  return c.json({ error: 'Сервис временно недоступен. Попробуйте позже.' }, 503);
});
app.notFound(c => c.json({ error: 'Маршрут не найден.' }, 404));

app.get('/api/health', c => c.json({ ok: true, framework: 'hono' }));

// Booking retains its same-origin checks, private sessions, persistent rate
// limits and atomic D1 batch operations. Never enable wildcard CORS here.
app.all('/api/booking/*', c => {
  let context = {};
  try { context = c.executionCtx; } catch { /* Node awaits notifications directly. */ }
  return handleBooking(c.req.raw, c.env || {}, context);
});

app.use('/api/chat', cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }));
app.post('/api/chat',
  bodyLimit({ maxSize: 65536, onError: c => c.json({ error: 'Слишком большой запрос.' }, 413) }),
  validator('json', (value, c) => {
    if (!value || Array.isArray(value) || typeof value !== 'object' ||
        typeof value.message !== 'string' || !value.message.trim() || value.message.length > 4000 ||
        (value.history !== undefined && !Array.isArray(value.history)) ||
        (value.mode !== undefined && !['pro', 'street', 'poselok', 'daw'].includes(value.mode))) {
      return c.json({ error: 'Проверьте сообщение, историю и режим чата.' }, 400);
    }
    return { message: value.message.trim(), mode: value.mode || 'pro',
      history: (value.history || []).slice(-10).filter(item => item &&
        ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
        .map(item => ({ role: item.role, content: item.content.slice(0, 4000) })) };
  }),
  c => handleChat({ request: c.req.raw, env: c.env || {}, input: c.req.valid('json') })
);
app.all('/api/chat', c => {
  c.header('Allow', 'POST, OPTIONS');
  return c.json({ error: 'Метод не поддерживается.' }, 405);
});
