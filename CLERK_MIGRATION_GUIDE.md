# NextAuth.js to Clerk Migration Guide

## Overview
This guide tracks the migration from NextAuth.js to Clerk authentication for the BoxyHQ SaaS Starter Kit.

## Migration Status Checklist

### 1. Core Setup ✅
- [x] Install Clerk packages
- [x] Add Clerk environment variables
- [x] Create Clerk provider setup
- [x] Update middleware configuration
- [x] Set up Clerk webhook handler

### 2. Authentication Providers
- [ ] Email/Password authentication
- [ ] Magic Links
- [ ] OAuth providers (GitHub, Google)
- [ ] SAML SSO (Enterprise)
- [ ] IdP-initiated flows

### 3. Session Management
- [x] Session token handling
- [ ] Session duration configuration
- [ ] User session management UI
- [x] API route authentication

### 4. Security Features
- [ ] Account lockout mechanism
- [ ] Email verification
- [ ] Password policies
- [ ] Bot protection (replacing reCAPTCHA)

### 5. Authorization & Teams
- [x] Team/Organization setup
- [x] RBAC implementation
- [x] Permission checks
- [ ] Team invitation flow
- [ ] API key authentication

### 6. Database Migration
- [ ] Update Prisma schema
- [ ] Create migration scripts
- [x] Map existing users to Clerk (via webhook)
- [x] Preserve team memberships (via webhook)

### 7. API Routes
- [ ] Update auth endpoints
- [x] Migrate protected routes (example created)
- [x] Update session checks
- [ ] Team API endpoints

### 8. UI Components
- [ ] Login page
- [ ] Sign up page
- [ ] Password reset
- [ ] Account settings
- [ ] Team management

### 9. Email Templates
- [ ] Welcome emails
- [ ] Password reset
- [ ] Team invitations
- [ ] Email verification

### 10. Testing
- [ ] Unit tests update
- [ ] E2E tests update
- [ ] Authentication flows
- [ ] Permission tests

## Key Differences & Mapping

### NextAuth.js → Clerk Mapping

| NextAuth Feature | Clerk Equivalent | Status |
|-----------------|------------------|---------|
| `getServerSession()` | `auth()` | ✅ Implemented |
| `useSession()` | `useAuth()` | ⏳ TODO |
| Credentials Provider | Email/Password | ⏳ TODO |
| Email Provider | Magic Links | ⏳ TODO |
| OAuth Providers | Social Connections | ⏳ TODO |
| SAML Jackson | Enterprise SSO | ⏳ TODO |
| Session Strategy | Built-in session management | ✅ Implemented |
| Account Lockout | Attack Protection | ⏳ TODO |
| Email Verification | Built-in verification | ⏳ TODO |

### Environment Variables

```env
# Remove NextAuth variables
# NEXTAUTH_URL=
# NEXTAUTH_SECRET=
# NEXTAUTH_SESSION_STRATEGY=

# Add Clerk variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/join
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_WEBHOOK_SECRET=
```

## Implementation Steps

### Step 1: Basic Clerk Setup ✅
1. ✅ Configure Clerk provider in `_app.tsx`
2. ✅ Update environment variables in `lib/env.ts`
3. ✅ Create new middleware with Clerk (`middleware.clerk.ts`)

### Step 2: Authentication Migration
1. Replace NextAuth providers with Clerk
2. Set up social connections
3. Configure enterprise SSO

### Step 3: Session & Authorization ✅
1. ✅ Implement organization-based teams
2. ✅ Set up custom roles and permissions
3. ✅ Create permission helpers (`lib/clerk.ts`, `lib/clerk-session.ts`)

### Step 4: Database & User Migration
1. Update Prisma schema
2. Create user migration script
3. ✅ Map teams to organizations (webhook handler)

### Step 5: UI & Email Updates
1. Update authentication pages
2. Migrate email templates
3. Update account management

## Files Created/Modified

### New Files
- `lib/clerk.ts` - Clerk helper functions
- `lib/clerk-session.ts` - Session management for API routes
- `middleware.clerk.ts` - Clerk-based middleware
- `pages/api/webhooks/clerk.ts` - Webhook handler for user/org sync
- `pages/api/teams/[slug]/index.clerk.ts` - Example migrated API route

### Modified Files
- `lib/env.ts` - Added Clerk configuration
- `pages/_app.tsx` - Added ClerkProvider

## Notes & Considerations

1. **SAML SSO**: Clerk supports enterprise SSO, but the implementation differs from SAML Jackson
2. **IdP-initiated flows**: May require custom implementation
3. **API Keys**: Will need custom implementation as Clerk doesn't have built-in API key management
4. **Session Duration**: Clerk has different session management approach
5. **Account Lockout**: Use Clerk's attack protection features

## Next Steps

1. Create client-side hooks for Clerk authentication
2. Migrate authentication pages (login, signup, etc.)
3. Update all API routes to use Clerk session management
4. Implement team invitation flow with Clerk
5. Configure Clerk authentication methods in dashboard