import { NotFoundError } from '@ember-data/adapter/error';

// Typed-404 detection for route model() rejections (CC-121).
//
// app/adapters/application.js handles 401 (refresh → retry → invalidate) and
// flashes on 403, then RE-THROWS everything else — so a 404 reaches a route's
// model() as ember-data's typed NotFoundError, not as a raw fetch Response.
//
// Shape of that typed error (ember-data 5.6 / @warp-drive/legacy):
//   error instanceof NotFoundError   → true
//   error.code === 'NotFoundError'   → true
//   error.isAdapterError             → true
//   error.errors[0].status           → '404'   (a STRING, per JSON:API)
//
// There is NO top-level numeric `error.status` on the typed error — keying off
// `error.status === 404` silently never matches. The instanceof check is the
// fast path; the duck-typed fallback covers errors that crossed a module
// boundary (or a test double) and so fail instanceof against our class
// identity, which is why both paths exist.
export function isNotFound(error) {
  if (!error) return false;
  if (error instanceof NotFoundError) return true;
  if (error.code === 'NotFoundError' || error.isAdapterError) {
    return (
      Array.isArray(error.errors) &&
      error.errors.some((e) => String(e?.status) === '404')
    );
  }
  return false;
}
