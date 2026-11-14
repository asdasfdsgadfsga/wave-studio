import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBooking, studioDate } from '../lib/booking/api.mjs';
import { openBookingDatabase } from '../lib/booking/sqlite.mjs';
import { app } from '../lib/api/app.mjs';

const HOUR = 3600000;
function fixture(t) {
  const db = openBookingDatabase(); t.after(() => db.close());
  const env = { BOOKING_DB: db, BOOKING_ADMIN_PASSWORD: 'test-only-password-for-booking' };
  const startsAt = new Date(Math.ceil((Date.now() + 30 * HOUR) / HOUR) * HOUR).toISOString();
  const input = (extra = {}) => ({ requestId: crypto.randomUUID(), name: 'Тестовый клиент', email: 'test@example.com', phone: '+7 999 123 45 67',
    service: 'vocal', startsAt, duration: 2, consent: true, ...extra });
  async function request(path, { method = 'GET', body, cookie, origin = 'https://studio.example', ip = '192.0.2.1' } = {}) {
    const response = await app.fetch(new Request('https://studio.example/api/booking/' + path, { method,
      headers: { Origin: origin, 'CF-Connecting-IP': ip, ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }), env);
    return { status: response.status, headers: response.headers, data: await response.json() };
  }
  async function login() {
    const response = await request('admin/login', { method: 'POST', body: { password: env.BOOKING_ADMIN_PASSWORD } });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    return response.headers.get('set-cookie').split(';')[0];
  }
  const create = body => request('bookings', { method: 'POST', body: body || input() });
  return { db, env, input, request, login, create, startsAt };
}

test('an unconfigured deployment is explicit and never accepts a fake booking', async () => {
  const config = await handleBooking(new Request('https://studio.example/api/booking/config'), {});
  assert.equal((await config.json()).ready, false);
  const booking = await handleBooking(new Request('https://studio.example/api/booking/bookings', { method: 'POST' }), {});
  assert.equal(booking.status, 503);
});
test('validation, consent, origin, body limits and private admin data', async t => {
  const f = fixture(t);
  assert.equal((await f.create(f.input({ consent: false }))).status, 400);
  assert.equal((await f.create(f.input({ startsAt: '2030-02-30T12:00:00.000Z' }))).status, 400);
  assert.equal((await f.create(f.input({ duration: 9 }))).status, 400);
  assert.equal((await f.create(f.input({ phone: '----------' }))).status, 400);
  assert.equal((await f.request('bookings', { method: 'POST', body: null })).status, 400);
  assert.equal((await f.request('bookings', { method: 'POST', body: f.input(), origin: 'https://attacker.example' })).status, 403);
  assert.equal((await f.create(f.input({ name: 'a'.repeat(9000) }))).status, 413);
  assert.equal((await f.request('admin/bookings')).status, 401);
  const response = await f.create(); assert.equal(response.status, 201);
  assert.equal('email' in response.data.booking, false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('overlapping concurrent requests are atomic; rejected requests leave no rows', async t => {
  const f = fixture(t);
  const requests = [f.input(), f.input({ startsAt: new Date(Date.parse(f.startsAt) + HOUR).toISOString() })];
  const results = await Promise.all(requests.map(f.create));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM bookings').first()).n, 1);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM booking_events').first()).n, 1);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM booking_slots').first()).n, 2);
});
test('idempotent retries do not create duplicates, including concurrent retries', async t => {
  const f = fixture(t), input = f.input();
  const responses = await Promise.all([f.create(input), f.create(input)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 201]);
  assert.equal(responses[0].data.booking.id, responses[1].data.booking.id);
  assert.equal((await f.create(input)).status, 200);
  assert.equal((await f.create({ ...input, email: 'someone@example.com' })).status, 409);
});
test('availability handles sessions across midnight, and expiry releases every hour', async t => {
  const f = fixture(t);
  const date = studioDate(Date.now() + 48 * HOUR);
  const startsAt = new Date(date + 'T23:00:00+10:00').toISOString();
  const response = await f.create(f.input({ startsAt }));
  assert.equal(response.status, 201);
  const tomorrow = studioDate(Date.parse(startsAt) + 2 * HOUR);
  const slots = await f.request('slots?day=' + tomorrow + '&duration=1');
  assert.equal(slots.status, 200);
  assert.equal(slots.data.slots.some(s => s.label === '00:00'), false);
  assert.equal(slots.data.slots.some(s => s.label === '01:00'), true);
  await f.db.prepare('UPDATE bookings SET hold_until=0 WHERE id=?').bind(response.data.booking.id).run();
  const released = await f.request('slots?day=' + tomorrow + '&duration=1');
  assert.equal(released.data.slots.some(s => s.label === '00:00'), true);
  assert.equal((await f.db.prepare('SELECT status FROM bookings').first()).status, 'expired');
});
test('server sessions use secure cookies and are revoked on logout', async t => {
  const f = fixture(t);
  assert.equal((await f.request('admin/login', { method: 'POST', body: { password: '0000' } })).status, 401);
  const response = await f.request('admin/login', { method: 'POST', body: { password: f.env.BOOKING_ADMIN_PASSWORD } });
  const cookie = response.headers.get('set-cookie');
  for (const attribute of ['__Host-wave_admin=', 'HttpOnly', 'SameSite=Strict', 'Secure']) assert.ok(cookie.includes(attribute));
  const token = cookie.split(';')[0];
  assert.equal((await f.request('admin/session', { cookie: token })).status, 200);
  const stored = await f.db.prepare('SELECT token_hash FROM booking_sessions').first();
  assert.notEqual(stored.token_hash, token.split('=')[1]);
  assert.equal((await f.request('admin/logout', { method: 'POST', body: {}, cookie: token })).status, 200);
  assert.equal((await f.request('admin/bookings', { cookie: token })).status, 401);
});
test('confirmation, safe rescheduling, version conflicts, cancellation and public prices', async t => {
  const f = fixture(t), cookie = await f.login();
  const a = await f.create(), b = await f.create(f.input({ startsAt: new Date(Date.parse(f.startsAt) + 4 * HOUR).toISOString() }));
  const patch = (id, body) => f.request('admin/bookings/' + id, { method: 'PATCH', cookie, body });
  const confirmed = await patch(a.data.booking.id, { version: 1, status: 'confirmed' });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
  assert.equal(confirmed.data.booking.hold_until, null);
  const occupied = await patch(a.data.booking.id, { version: 2, startsAt: b.data.booking.startsAt });
  assert.equal(occupied.status, 409);
  assert.equal((await f.db.prepare('SELECT starts_at FROM bookings WHERE id=?').bind(a.data.booking.id).first()).starts_at, Date.parse(f.startsAt));
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM booking_slots WHERE booking_id=?').bind(a.data.booking.id).first()).n, 2);
  assert.equal((await patch(a.data.booking.id, { version: 1, note: 'stale' })).status, 409);
  const nextTime = new Date(Date.parse(f.startsAt) + 8 * HOUR).toISOString();
  const moved = await patch(a.data.booking.id, { version: 2, startsAt: nextTime, duration: 1, note: '<script>client text</script>' });
  assert.equal(moved.status, 200, JSON.stringify(moved.data));
  assert.equal(moved.data.booking.starts_at, Date.parse(nextTime));
  assert.equal((await patch(a.data.booking.id, { version: 3, status: 'completed' })).status, 400);
  assert.equal((await patch(a.data.booking.id, { version: 3, status: 'cancelled' })).status, 200);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM booking_slots WHERE booking_id=?').bind(a.data.booking.id).first()).n, 0);
  assert.equal((await patch(a.data.booking.id, { version: 4, status: 'confirmed' })).status, 400);
  const settings = await f.request('admin/settings', { method: 'PUT', cookie, body: { vocal: '2 000 ₽ / час', mix: '4 000 ₽', beat: '6 000 ₽' } });
  assert.equal(settings.status, 200);
  assert.equal((await f.request('config')).data.services[0].price, '2 000 ₽ / час');
});
test('simultaneous admin updates cannot overwrite each other', async t => {
  const f = fixture(t), cookie = await f.login(), created = await f.create();
  const path = 'admin/bookings/' + created.data.booking.id;
  const result = await Promise.all(['first', 'second'].map(note => f.request(path, { method: 'PATCH', cookie, body: { version: 1, note } })));
  assert.deepEqual(result.map(r => r.status).sort(), [200, 409]);
  assert.equal((await f.db.prepare('SELECT version FROM bookings').first()).version, 2);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM booking_events').first()).n, 2);
});
test('login rate limits are persisted in the database', async t => {
  const f = fixture(t);
  for (let i = 0; i < 5; i++) assert.equal((await f.request('admin/login', { method: 'POST', body: { password: 'wrong' } })).status, 401);
  assert.equal((await f.request('admin/login', { method: 'POST', body: { password: f.env.BOOKING_ADMIN_PASSWORD } })).status, 429);
});
