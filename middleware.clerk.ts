import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Constants for security headers
const SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
} as const;

// Generate CSP
const generateCSP = (): string => {
  const policies = {
    'default-src': ["'self'"],
    'img-src': [
      "'self'",
      'boxyhq.com',
      '*.boxyhq.com',
      '*.dicebear.com',
      'data:',
      'img.clerk.com',
    ],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      '*.gstatic.com',
      '*.google.com',
      'clerk.*.lcl.dev',
      '*.clerk.accounts.dev',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'connect-src': [
      "'self'",
      '*.google.com',
      '*.gstatic.com',
      'boxyhq.com',
      '*.ingest.sentry.io',
      '*.mixpanel.com',
      'clerk.*.lcl.dev',
      '*.clerk.accounts.dev',
    ],
    'frame-src': ["'self'", '*.google.com', '*.gstatic.com', 'clerk.*.lcl.dev', '*.clerk.accounts.dev'],
    'font-src': ["'self'", 'fonts.clerk.accounts.dev'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  return Object.entries(policies)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .concat(['upgrade-insecure-requests'])
    .join('; ');
};

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/api/hello',
  '/api/health',
  '/api/auth/(.*)',
  '/api/oauth/(.*)',
  '/api/scim/v2.0/(.*)',
  '/api/invitations/(.*)',
  '/api/webhooks/stripe',
  '/api/webhooks/dsync',
  '/api/webhooks/clerk',
  '/auth/(.*)',
  '/invitations/(.*)',
  '/terms-condition',
  '/unlock-account',
  '/login/saml',
  '/.well-known/(.*)',
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware((auth, req) => {
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    auth.protect();
  }

  // Add security headers
  const requestHeaders = new Headers(req.headers);
  const csp = generateCSP();
  
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (process.env.SECURITY_HEADERS_ENABLED === 'true') {
    // Set security headers
    response.headers.set('Content-Security-Policy', csp);
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};