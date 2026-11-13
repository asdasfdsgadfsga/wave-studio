// Pages static assets return 200 for Range requests. Serve the two A/B WAVs
// with byte ranges so browsers can seek before downloading the entire track.
export async function onRequest({ request, env, next }) {
    const url = new URL(request.url);
    if (!/^\/audio\/demo_(raw|mastered)\.wav$/.test(url.pathname) ||
        !['GET', 'HEAD'].includes(request.method)) return next();

    url.search = '';
    // Fetch the complete representation without client Range/conditional headers.
    const asset = await env.ASSETS.fetch(new Request(url, { method: request.method }));
    if (asset.status !== 200) return asset;

    const headers = new Headers(asset.headers);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=86400, no-transform');
    const size = Number(headers.get('Content-Length'));
    const range = request.headers.get('Range');
    const ifRange = request.headers.get('If-Range');
    const validatorMatches = !ifRange ||
        (!ifRange.startsWith('W/') && ifRange === headers.get('ETag')) ||
        (headers.has('Last-Modified') && ifRange === headers.get('Last-Modified'));
    const match = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());

    // Unsupported/malformed ranges and changed validators receive the full file.
    if (request.method === 'HEAD' || !size || !match || (!match[1] && !match[2]) || !validatorMatches) {
        return new Response(asset.body, { status: 200, headers });
    }

    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
        await asset.body.cancel();
        headers.set('Content-Range', `bytes */${size}`);
        headers.set('Content-Length', '0');
        return new Response(null, { status: 416, headers });
    }

    const bytes = await asset.arrayBuffer();
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(new Uint8Array(bytes, start, end - start + 1), { status: 206, headers });
}
