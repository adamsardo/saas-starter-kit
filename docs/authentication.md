# Authentication with Clerk

This application uses [Clerk](https://clerk.com) for authentication and user management.

## Features

- **Multiple Authentication Methods**:
  - Email/Password
  - OAuth (GitHub, Google)
  - Magic Links
  - SAML SSO (Enterprise plan required)
  - Two-Factor Authentication

- **Organization Management**:
  - Multi-tenancy support
  - Role-based access control (Owner, Admin, Member)
  - Team invitations
  - Domain allowlisting

- **Security**:
  - Attack protection (bot protection, rate limiting)
  - Session management
  - Security headers via middleware
  - Password policies

## Configuration

### Environment Variables

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/join
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Clerk Dashboard Setup

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Configure authentication methods:
   - Enable Email/Password
   - Add OAuth providers (GitHub, Google)
   - Enable Magic Links
   - Configure password policies
4. Enable Organizations:
   - Go to Organizations settings
   - Enable organizations
   - Configure roles (owner, admin, member)
5. Set up webhooks:
   - Add webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Select events: `user.*`, `organization.*`, `organizationMembership.*`

## Usage

### Client-Side

```typescript
import { useSession, useSignIn, useSignOut } from '@/hooks/auth';

// Get current session
const { data: session, status } = useSession();

// Sign in
const signIn = useSignIn();
await signIn('google', { callbackUrl: '/dashboard' });

// Sign out
const signOut = useSignOut();
await signOut();
```

### Server-Side (API Routes)

```typescript
import { getSession } from '@/lib/session';
import { throwIfNotAllowed } from '@/lib/clerk-session';

// Get session in API route
const session = await getSession(req, res);
if (!session) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Check permissions
await throwIfNotAllowed(req, res, 'team_webhook', 'create');
```

### Protected Pages

Pages are automatically protected by the middleware. Define protected routes in `middleware.ts`:

```typescript
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/teams(.*)',
  '/api/teams(.*)',
]);
```

## Role Mapping

Clerk organization roles are mapped to application roles:

- `org:owner` → `OWNER`
- `org:admin` → `ADMIN`
- `org:member` → `MEMBER`

## Migration from NextAuth

The application has been fully migrated from NextAuth.js to Clerk. All authentication flows, session management, and user data are now handled by Clerk.

### Key Changes:
- Sessions managed by Clerk infrastructure
- No need for session tables in database
- Automatic session refresh and expiry
- Built-in attack protection
- Enhanced security features

## Troubleshooting

### Common Issues

1. **"No team selected" error**
   - Ensure user is part of at least one organization
   - Check organization membership in Clerk dashboard

2. **Permission denied errors**
   - Verify user's role in the organization
   - Check permission mappings in `lib/permissions.ts`

3. **Webhook sync issues**
   - Verify webhook secret is correct
   - Check webhook logs in Clerk dashboard
   - Ensure webhook endpoint is accessible

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=clerk:*
```