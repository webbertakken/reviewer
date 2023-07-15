import { Toucan } from 'toucan-js'
import type { Request, ExecutionContext } from '@cloudflare/workers-types'
import { Config } from './config.mjs'
import { BaseOptions } from 'toucan-js/dist/types.js'

/**
 * Based on `@cloudflare/worker-sentry` but up-to-date and with compatible types.
 * @see https://github.com/cloudflare/worker-sentry
 */
export const initSentry = (
  config: Config['sentry'],
  request: Request,
  context: ExecutionContext,
): Toucan => {
  const { dsn, clientId, clientSecret, environment, enabled } = config

  if (!enabled) return { captureException: () => {}, captureMessage: () => {} } as never

  const sentry: Toucan = new Toucan({
    dsn,
    environment,
    release: '1.0.0',
    sampleRate: 1.0,
    tracesSampleRate: 1.0,
    context,
    request: request as never as BaseOptions['request'], // toucan-js should be using `Request` from `@cloudflare/workers-types`
    requestDataOptions: {
      allowedHeaders: [
        'user-agent',
        'cf-challenge',
        'accept-encoding',
        'accept-language',
        'cf-ray',
        'content-length',
        'content-type',
        'x-real-ip',
        'host',
      ],
      allowedSearchParams: /(.*)/,
    },
    transportOptions: {
      headers: {
        'CF-Access-Client-ID': clientId,
        'CF-Access-Client-Secret': clientSecret,
      },
    },
  })

  const colo = (request.cf?.colo || 'UNKNOWN') as string
  sentry.setTag('colo', colo)

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
  const userAgent = request.headers.get('user-agent') || ''
  sentry.setUser({ ip, userAgent, colo })

  return sentry
}
