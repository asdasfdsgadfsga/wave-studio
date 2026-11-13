const HOUR = 3600000;
const DAY = 24 * HOUR;
export const SERVICES = {
  vocal: { name: 'Запись вокала', price: '1 500 – 2 500 ₽ / час' },
  mix: { name: 'Сведение и мастеринг', price: '3 000 – 7 000 ₽ / трек' },
  beat: { name: 'Написание бита', price: 'от 5 000 ₽' }
};
const statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'expired'];
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra }
});
class APIError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new APIError(status, message); };
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const hash = async text => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const statement = (db, sql, ...args) => db.prepare(sql).bind(...args);
const rows = async (db, sql, ...args) => (await statement(db, sql, ...args).all()).results;
const first = (db, sql, ...args) => statement(db, sql, ...args).first();
const run = (db, sql, ...args) => statement(db, sql, ...args).run();

export function studioDate(time = Date.now()) {
  return new Date(time + 10 * HOUR).toISOString().slice(0, 10);
}
export function validateTime(value, duration, now = Date.now()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)) fail(400, 'Выберите время из расписания.');
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value ||
      time < now + 2 * HOUR || time + duration * HOUR > now + 90 * DAY) {
    fail(400, 'Запись доступна за 2 часа и не более чем на 90 дней вперёд.');
  }
  return time;
}
function integer(value, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail(400, 'Недопустимое числовое значение.');
  return n;
}
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b-\u001f]/.test(value)) fail(400, 'Проверьте заполненные поля.');
  const result = value.trim();
  if (required && !result) fail(400, 'Заполните обязательные поля.');
  return result;
}
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415, 'Ожидается JSON.');
  if (Number(request.headers.get('Content-Length')) > 8192) fail(413, 'Слишком большой запрос.');
  // Bound streamed requests as well as requests carrying Content-Length.
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'Пустой запрос.');
  const chunks = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 8192) { await reader.cancel(); fail(413, 'Слишком большой запрос.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { fail(400, 'Некорректный JSON.'); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') fail(400, 'Ожидается объект JSON.');
  return parsed;
}
function sameOrigin(request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    fail(403, 'Отправьте запрос с сайта студии.');
  }
}
async function rate(db, key, limit, windowMs, now) {
  const bucket = `${key}:${Math.floor(now / windowMs)}`;
  const result = await first(db, `INSERT INTO booking_limits(key,count,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`, bucket, now + windowMs);
  if (result.count > limit) fail(429, 'Слишком много попыток. Попробуйте позже.');
}
async function expire(db, now) {
  await db.batch([
    statement(db, `DELETE FROM booking_slots WHERE booking_id IN
      (SELECT id FROM bookings WHERE status='pending' AND hold_until<=?)`, now),
    statement(db, `UPDATE bookings SET status='expired',version=version+1,updated_at=?
      WHERE status='pending' AND hold_until<=?`, now, now),
    statement(db, 'DELETE FROM booking_sessions WHERE expires_at<=?', now),
    statement(db, 'DELETE FROM booking_limits WHERE expires_at<=?', now)
  ]);
}
function slots(db, id, startsAt, duration) {
  return Array.from({ length: duration }, (_, i) =>
    statement(db, 'INSERT INTO booking_slots(starts_at,booking_id) VALUES (?,?)', startsAt + i * HOUR, id));
}
function conflict(error) {
  if (/UNIQUE constraint failed: booking_slots/.test(error.message)) fail(409, 'Это время уже занято. Выберите другое.');
  if (/UNIQUE constraint failed: bookings.request_key/.test(error.message)) fail(409, 'Заявка уже отправлена. Обновите страницу.');
  throw error;
}
function publicReceipt(b) {
  return { id: b.id, status: b.status, startsAt: new Date(b.starts_at).toISOString(),
    duration: b.duration, holdUntil: b.hold_until ? new Date(b.hold_until).toISOString() : null };
}
const cookieName = request => new URL(request.url).protocol === 'https:' ? '__Host-wave_admin' : 'wave_admin';
const cookie = (request, token, seconds) => `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
async function authenticate(request, db, now) {
  const token = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName(request) + '='))?.split('=')[1];
  if (!/^[a-f0-9]{64}$/.test(token || '')) fail(401, 'Войдите в админку.');
  const tokenHash = await hash(token);
  if (!await first(db, 'SELECT token_hash FROM booking_sessions WHERE token_hash=? AND expires_at>?', tokenHash, now)) fail(401, 'Сессия истекла. Войдите снова.');
  return tokenHash;
}
async function config(env) {
  let prices = {};
  if (env.BOOKING_DB) {
    const row = await first(env.BOOKING_DB, "SELECT value FROM booking_settings WHERE key='prices'");
    if (row) prices = JSON.parse(row.value);
  }
  return { ready: !!env.BOOKING_DB && (env.BOOKING_ADMIN_PASSWORD || '').length >= 16,
    timezone: 'Asia/Vladivostok', timezoneLabel: 'Хабаровск, UTC+10', holdHours: 24,
    services: Object.entries(SERVICES).map(([id, s]) => ({ id, ...s, price: prices[id] || s.price })) };
}

// A notification error never turns a saved booking into a failed booking.
export async function notify(env, booking, action) {
  const result = {};
  const when = new Date(booking.starts_at).toLocaleString('ru-RU', { timeZone: 'Asia/Vladivostok' });
  const message = `WaveMusic · ${action}\n№ ${booking.id}\n${SERVICES[booking.service].name}\n${when} (Хабаровск), ${booking.duration} ч\n${booking.name}\n${booking.phone}\n${booking.email}`;
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message }), signal: AbortSignal.timeout(8000)
      });
      result.telegram = response.ok && (await response.json()).ok === true;
    } catch { result.telegram = false; }
  }
  if (env.RESEND_API_KEY && env.BOOKING_EMAIL_FROM && (['confirmed', 'cancelled'].includes(action) || action === 'rescheduled' && booking.status === 'confirmed')) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
          'Idempotency-Key': `booking-${booking.id}-${booking.version}` },
        body: JSON.stringify({ from: env.BOOKING_EMAIL_FROM, to: [booking.email], subject: `WaveMusic: ${action === 'cancelled' ? 'запись отменена' : 'запись подтверждена'}`,
          text: `Здравствуйте, ${booking.name}!\n${action === 'cancelled' ? 'Ваша запись отменена.' : `Ваша запись: ${when} (Хабаровск), ${booking.duration} ч.`}\nУслуга: ${SERVICES[booking.service].name}.\nНомер заявки: ${booking.id}.` }), signal: AbortSignal.timeout(8000)
      });
      result.email = response.ok;
    } catch { result.email = false; }
  }
  return result;
}

export async function handleBooking(request, env, context = {}) {
  try { return await route(request, env, context); }
  catch (error) {
    if (error instanceof APIError) return json({ error: error.message }, error.status);
    // Never log request bodies, client contact details or provider credentials.
    console.error('Booking API failed:', error.name);
    return json({ error: 'Сервис записи временно недоступен. Попробуйте позже.' }, 503);
  }
}
async function route(request, env, context) {
  const now = Date.now(), url = new URL(request.url), path = url.pathname.replace(/^\/api\/booking\/?/, '');
  const db = env.BOOKING_DB;
  if (path === 'config' && request.method === 'GET') return json(await config(env));
  if (!db || (env.BOOKING_ADMIN_PASSWORD || '').length < 16) fail(503, 'Онлайн-запись ещё настраивается. Свяжитесь со студией.');
  if (!['GET','HEAD'].includes(request.method)) sameOrigin(request);
  const ipHash = await hash((request.headers.get('CF-Connecting-IP') || 'local') + env.BOOKING_ADMIN_PASSWORD);
  if (path === 'slots' && request.method === 'GET') {
    await rate(db, `slots:${ipHash}`, 120, 60000, now);
    const day = url.searchParams.get('day'), duration = integer(url.searchParams.get('duration') || 1, 1, 8);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || day < studioDate(now) || day > studioDate(now + 89 * DAY)) fail(400, 'Выберите дату в ближайшие 90 дней.');
    const start = Date.parse(`${day}T00:00:00+10:00`);
    if (studioDate(start) !== day) fail(400, 'Некорректная дата.');
    await expire(db, now);
    const busy = new Set((await rows(db, 'SELECT starts_at FROM booking_slots WHERE starts_at>=? AND starts_at<?', start, start + DAY + 8 * HOUR)).map(s => s.starts_at));
    const available = Array.from({ length: 24 }, (_, h) => start + h * HOUR).filter(t => t >= now + 2 * HOUR && t + duration * HOUR <= now + 90 * DAY &&
      Array.from({ length: duration }, (_, i) => t + i * HOUR).every(t => !busy.has(t)));
    return json({ day, timezone: 'Asia/Vladivostok', slots: available.map(t => ({ startsAt: new Date(t).toISOString(), label: new Date(t + 10 * HOUR).toISOString().slice(11, 16) })) });
  }
  if (path === 'bookings' && request.method === 'POST') {
    const input = await body(request);
    if (input.website) fail(400, 'Проверьте заполненные поля.');
    if (input.consent !== true) fail(400, 'Подтвердите обработку контактных данных для записи.');
    const requestKey = text(input.requestId, 80, true);
    if (!/^[a-f0-9-]{36}$/i.test(requestKey)) fail(400, 'Обновите страницу и попробуйте снова.');
    const b = { id: crypto.randomUUID(), name: text(input.name, 100, true), email: text(input.email, 200, true).toLowerCase(),
      phone: text(input.phone, 40, true), service: input.service, duration: integer(input.duration, 1, 8), comment: text(input.comment || '', 1000) };
    if (b.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) || !/^\+?[\d ()-]{10,30}$/.test(b.phone) || b.phone.replace(/\D/g, '').length < 10 || typeof b.service !== 'string' || !Object.hasOwn(SERVICES, b.service)) fail(400, 'Проверьте имя, email, телефон и услугу.');
    b.starts_at = validateTime(input.startsAt, b.duration, now);
    b.status = 'pending'; b.hold_until = now + DAY;
    await expire(db, now);
    const prior = await first(db, 'SELECT * FROM bookings WHERE request_key=?', requestKey);
    if (prior) {
      if (prior.email !== b.email || prior.phone !== b.phone || prior.starts_at !== b.starts_at || prior.duration !== b.duration || prior.service !== b.service) fail(409, 'Эта заявка уже отправлена.');
      return json({ booking: publicReceipt(prior) });
    }
    await rate(db, `create:${ipHash}`, 5, HOUR, now);
    await rate(db, `contact:${await hash(b.email)}`, 5, DAY, now);
    try {
      await db.batch([
        statement(db, `INSERT INTO bookings(id,request_key,name,email,phone,service,starts_at,duration,status,comment,created_at,updated_at,hold_until)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, b.id, requestKey, b.name, b.email, b.phone, b.service, b.starts_at, b.duration, b.status, b.comment, now, now, b.hold_until),
        ...slots(db, b.id, b.starts_at, b.duration),
        statement(db, 'INSERT INTO booking_events(booking_id,action,created_at) VALUES (?,?,?)', b.id, 'created', now)
      ]);
    } catch (error) {
      if (/UNIQUE constraint failed: bookings.request_key/.test(error.message)) {
        const saved = await first(db, 'SELECT * FROM bookings WHERE request_key=?', requestKey);
        if (saved && saved.email === b.email && saved.phone === b.phone && saved.starts_at === b.starts_at && saved.duration === b.duration && saved.service === b.service) return json({ booking: publicReceipt(saved) });
      }
      conflict(error);
    }
    const work = notify(env, b, 'created');
    if (context.waitUntil) context.waitUntil(work); else await work;
    return json({ booking: publicReceipt(b) }, 201);
  }
  if (path === 'admin/login' && request.method === 'POST') {
    await rate(db, `login:${ipHash}`, 5, 15 * 60000, now);
    const input = await body(request);
    const expected = await hash(env.BOOKING_ADMIN_PASSWORD), given = await hash(text(input.password || '', 256));
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ given.charCodeAt(i);
    if (difference) fail(401, 'Неверный пароль.');
    const token = random();
    await run(db, 'INSERT INTO booking_sessions(token_hash,expires_at) VALUES (?,?)', await hash(token), now + 8 * HOUR);
    return json({ authenticated: true }, 200, { 'Set-Cookie': cookie(request, token, 8 * 3600) });
  }
  if (!path.startsWith('admin/')) fail(404, 'Маршрут не найден.');
  const sessionHash = await authenticate(request, db, now);
  if (path === 'admin/session' && request.method === 'GET') return json({ authenticated: true,
    notifications: { telegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID), email: !!(env.RESEND_API_KEY && env.BOOKING_EMAIL_FROM) } });
  if (path === 'admin/logout' && request.method === 'POST') {
    await run(db, 'DELETE FROM booking_sessions WHERE token_hash=?', sessionHash);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  }
  if (path === 'admin/settings') {
    if (request.method === 'GET') return json(await config(env));
    if (request.method === 'PUT') {
      const input = await body(request), prices = {};
      for (const id of Object.keys(SERVICES)) prices[id] = text(input[id], 100, true);
      await run(db, "INSERT INTO booking_settings(key,value) VALUES ('prices',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify(prices));
      return json({ ok: true });
    }
  }
  await expire(db, now);
  if (path === 'admin/bookings' && request.method === 'GET') {
    const status = url.searchParams.get('status') || '', day = url.searchParams.get('day') || '';
    if (status && !statuses.includes(status)) fail(400, 'Неизвестный статус.');
    const offset = integer(url.searchParams.get('offset') || 0, 0, 100000);
    const clauses = [], args = [];
    if (status) { clauses.push('status=?'); args.push(status); }
    if (day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail(400, 'Некорректная дата.');
      const start = Date.parse(`${day}T00:00:00+10:00`);
      clauses.push('starts_at>=? AND starts_at<?'); args.push(start, start + DAY);
    }
    const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
    return json({ bookings: await rows(db, 'SELECT * FROM bookings' + where + ' ORDER BY created_at DESC,id DESC LIMIT 100 OFFSET ?', ...args, offset),
      total: (await first(db, 'SELECT COUNT(*) AS count FROM bookings' + where, ...args)).count, offset });
  }
  const match = /^admin\/bookings\/([a-f0-9-]{36})$/.exec(path);
  if (match && request.method === 'PATCH') {
    const input = await body(request), id = match[1];
    const b = await first(db, 'SELECT * FROM bookings WHERE id=?', id);
    if (!b) fail(404, 'Заявка не найдена.');
    if (input.version !== b.version) fail(409, 'Заявку уже изменили. Обновите список.');
    const status = input.status ?? b.status;
    const transitions = { pending: ['pending','confirmed','cancelled'], confirmed: ['confirmed','completed','cancelled'], completed: ['completed'], cancelled: ['cancelled'], expired: ['expired'] };
    if (!transitions[b.status].includes(status)) fail(400, 'Недопустимая смена статуса.');
    const note = input.note === undefined ? b.note : text(input.note, 2000);
    const duration = input.duration === undefined ? b.duration : integer(input.duration, 1, 8);
    const reschedule = input.startsAt !== undefined || input.duration !== undefined;
    if (reschedule && !['pending','confirmed'].includes(status)) fail(400, 'Перенос возможен только для активной записи.');
    const startsAt = reschedule ? validateTime(input.startsAt || new Date(b.starts_at).toISOString(), duration, now) : b.starts_at;
    if (status === 'completed' && now < startsAt + duration * HOUR) fail(400, 'Сессию можно завершить после окончания записи.');
    const action = reschedule ? 'rescheduled' : status !== b.status ? status : 'note';
    const operations = [
      // A stale concurrent edit aborts the transaction via NOT NULL, rolling back slot changes too.
      statement(db, `UPDATE bookings SET status=?,note=?,starts_at=?,duration=?,hold_until=?,updated_at=?,version=version+1
        WHERE id=? AND version=?`, status, note, startsAt, duration, status === 'pending' ? b.hold_until : null, now, id, b.version),
      statement(db, `INSERT INTO booking_events(booking_id,action,created_at) VALUES
        ((SELECT id FROM bookings WHERE id=? AND version=? AND changes()=1),?,?)`, id, b.version + 1, action, now)
    ];
    if (reschedule || status === 'cancelled') operations.push(statement(db, 'DELETE FROM booking_slots WHERE booking_id=?', id));
    if (reschedule && status !== 'cancelled') operations.push(...slots(db, id, startsAt, duration));
    try { await db.batch(operations); }
    catch (error) {
      if (/NOT NULL constraint failed: booking_events.booking_id/.test(error.message)) fail(409, 'Заявку уже изменили. Обновите список.');
      conflict(error);
    }
    const updated = await first(db, 'SELECT * FROM bookings WHERE id=?', id);
    const notifications = action === 'note' ? {} : await notify(env, updated, action);
    return json({ booking: updated, notifications });
  }
  fail(404, 'Маршрут не найден.');
}
