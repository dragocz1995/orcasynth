// serverLogger touches node:fs (unsupported in the Edge runtime). With Edge middleware present, Next
// compiles instrumentation for BOTH runtimes — so import the logger LAZILY, only on the Node side, to
// keep the edge instrumentation bundle free of node:fs.

/** Next.js server-startup hook — runs once when the web server boots. Records the start in the shared
 *  logs/ folder so the web process leaves a trail alongside the daemon. Node runtime only. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { logger, LOG_DIR } = await import('./lib/serverLogger');
  logger('web').info(`web server started — logs → ${LOG_DIR}`);
}

/** Next.js server-side error hook — every uncaught error in a Server Component / route / proxy lands
 *  here. Mirror it into the shared log so server faults aren't lost to the console alone. */
export async function onRequestError(err: unknown, request: { path?: string; method?: string }): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { logger } = await import('./lib/serverLogger');
  logger('web').error(`request error ${request.method ?? ''} ${request.path ?? ''}`.trim(), err);
}
