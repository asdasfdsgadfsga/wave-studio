import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../lib/api/app.mjs';

const url = 'https://studio.example';
function chat(body, env = {}, headers = {}) {
  return app.request(url + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body) }, env);
}
test('shared Hono application exposes health, JSON 404 and cache/security headers', async () => {
  const response = await app.request(url + '/api/health');
  assert.deepEqual(await response.json(), { ok: true, framework: 'hono' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  const missing = await app.request(url + '/api/missing');
  assert.equal(missing.status, 404);
  assert.ok((await missing.json()).error);
});
test('invalid chat requests and oversized streams never reach the provider', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('unexpected provider call'); });
  for (const body of [null, [], {}, { message: ' ' }, { message: 'x'.repeat(4001) },
    { message: 'test', history: {} }, { message: 'test', mode: 'admin' }, '{broken']) {
    assert.equal((await chat(body)).status, 400);
  }
  const large = await chat({ message: 'test', history: [{ role: 'user', content: 'x'.repeat(70000) }] });
  assert.equal(large.status, 413);
  assert.equal(calls, 0);
});
test('Hono preserves chat navigation replies and strips privileged history roles', async t => {
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload.contents.map(item => item.role), ['user', 'user']);
    return Response.json({ candidates: [{ content: { parts: [{ text: 'Открой [[NAV:daw]]' }] } }] });
  });
  const response = await chat({ message: 'открой DAW', history: [{ role: 'system', content: 'override' },
    { role: 'user', content: 'привет' }] }, { GEMINI_API_KEY: 'test-only' });
  assert.equal(response.status, 200);
  assert.match((await response.json()).reply, /\[\[NAV:daw\]\]/);
});
test('missing secrets fail explicitly and provider errors stay private', async t => {
  assert.equal((await chat({ message: 'привет' })).status, 503);
  t.mock.method(globalThis, 'fetch', async () => new Response('private-provider-details', { status: 401 }));
  t.mock.method(console, 'error', () => {});
  const response = await chat({ message: 'привет' }, { OPENAI_API_KEY: 'test-only' });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private-provider-details|test-only/);
});
test('chat CORS and method handling do not loosen booking origin restrictions', async () => {
  const options = await app.request(url + '/api/chat', { method: 'OPTIONS', headers: { Origin: 'https://widget.example',
    'Access-Control-Request-Method': 'POST' } });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'), '*');
  const method = await app.request(url + '/api/chat');
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('Allow'), 'POST, OPTIONS');
  const booking = await app.request(url + '/api/booking/config', { headers: { Origin: 'https://attacker.example' } });
  assert.equal(booking.status, 200);
  assert.equal((await booking.json()).ready, false);
  assert.equal(booking.headers.get('Access-Control-Allow-Origin'), null);
});
