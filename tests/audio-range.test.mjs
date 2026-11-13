import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../functions/audio/[[path]].js', import.meta.url), 'utf8');
const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const wav = Uint8Array.from({ length: 100 }, (_, i) => i);

async function requestAudio(headers = {}, method = 'GET', path = '/audio/demo_raw.wav?v=seek-1', omitLength = false) {
    return onRequest({
        request: new Request('https://wave.test' + path, { headers, method }),
        env: { ASSETS: { fetch: async request => {
            assert.equal(request.headers.get('Range'), null);
            assert.equal(new URL(request.url).search, '');
            return new Response(wav, { headers: {
                'Content-Type': 'audio/wav', ...(omitLength ? {} : { 'Content-Length': '100' }), ETag: '"wav-v1"'
            } });
        } } },
        next: () => new Response('passthrough', { status: 202 })
    });
}

test('serves exact bytes for bounded, open-ended, suffix and clipped ranges', async () => {
    for (const [range, start, end] of [
        ['bytes=20-39', 20, 39], ['bytes=75-', 75, 99], ['bytes=-10', 90, 99],
        ['bytes=90-999', 90, 99], ['bytes=-999', 0, 99], ['bytes=0-0', 0, 0]
    ]) {
        const response = await requestAudio({ Range: range });
        assert.equal(response.status, 206, range);
        assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
        assert.equal(response.headers.get('Content-Range'), `bytes ${start}-${end}/100`);
        assert.equal(Number(response.headers.get('Content-Length')), end - start + 1);
        assert.deepEqual(new Uint8Array(await response.arrayBuffer()), wav.slice(start, end + 1));
    }
});

test('rejects unsatisfiable ranges without sending a body', async () => {
    for (const range of ['bytes=100-', 'bytes=60-30', 'bytes=-0', 'bytes=999999999999999999999-']) {
        const response = await requestAudio({ Range: range });
        assert.equal(response.status, 416, range);
        assert.equal(response.headers.get('Content-Range'), 'bytes */100');
        assert.equal((await response.arrayBuffer()).byteLength, 0);
    }
});

test('full file remains playable without Range or with an unsupported Range', async () => {
    for (const headers of [{}, { Range: 'bytes=0-10,20-30' }, { Range: 'bytes=-' }, { Range: 'invalid' },
        { Range: 'bytes=20-', 'If-Range': '"old"' }, { Range: 'bytes=20-', 'If-Range': 'W/"wav-v1"' }]) {
        const response = await requestAudio(headers);
        assert.equal(response.status, 200);
        assert.deepEqual(new Uint8Array(await response.arrayBuffer()), wav);
    }
    assert.equal((await requestAudio({ Range: 'bytes=20-', 'If-Range': '"wav-v1"' })).status, 206);
});

test('HEAD advertises seeking and unrelated audio keeps its existing route', async () => {
    const response = await requestAudio({ Range: 'bytes=20-30' }, 'HEAD');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Length'), '100');
    assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
    assert.equal((await response.arrayBuffer()).byteLength, 0);
    assert.equal((await requestAudio({}, 'GET', '/audio/m1klussshevskiy_ttg.mp3')).status, 202);
    assert.equal((await requestAudio({}, 'POST')).status, 202);
});

test('Pages assets without Content-Length still support seeking and HEAD', async () => {
    for (const method of ['GET', 'HEAD']) {
        const response = await requestAudio({ Range: 'bytes=20-39' }, method, undefined, true);
        assert.equal(response.status, method === 'HEAD' ? 200 : 206);
        assert.equal(response.headers.get('Content-Length'), method === 'HEAD' ? '100' : '20');
        assert.equal((await response.arrayBuffer()).byteLength, method === 'HEAD' ? 0 : 20);
    }
    const full = await requestAudio({}, 'GET', undefined, true);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get('Content-Length'), '100');
    assert.deepEqual(new Uint8Array(await full.arrayBuffer()), wav);
});
