import { app } from '../../lib/api/app.mjs';

// Direct Web Fetch adapter keeps Pages support independent of deprecated
// framework-specific platform adapters.
export function onRequest(context) {
  return app.fetch(context.request, context.env, {
    waitUntil: work => context.waitUntil(work),
    passThroughOnException: () => context.passThroughOnException(),
  });
}
