# Clerk Migration Completion Checklist

## Completed Items ✅

### Core Setup
- [x] Installed Clerk packages
- [x] Updated environment variables in `lib/env.ts`
- [x] Created Clerk configuration in `lib/clerk.ts`
- [x] Created Clerk session helpers in `lib/clerk-session.ts`
- [x] Created Clerk webhook handler
- [x] Updated Prisma schema with Clerk fields
- [x] Created user migration script
- [x] Updated middleware to use Clerk
- [x] Created Clerk auth hook

### Authentication Pages
- [x] Updated login page (`pages/auth/login.tsx`)
- [x] Updated signup page (`pages/auth/join.tsx`)
- [x] Created example Clerk auth pages

### API Routes
- [x] Updated team API route (`pages/api/teams/[slug]/index.ts`)
- [x] Updated team members API (`pages/api/teams/[slug]/members.ts`)
- [x] Created example Clerk API route

### Account Management
- [x] Updated account settings page (`pages/settings/account.tsx`)

### Components
- [x] Updated AppShell for dual auth support

## Remaining Tasks 📝

### 1. Update All API Routes
- [ ] `/api/teams/index.ts` - List teams
- [ ] `/api/teams/[slug]/invitations.ts` - Team invitations
- [ ] `/api/teams/[slug]/api-keys/*.ts` - API key management
- [ ] `/api/teams/[slug]/sso.ts` - SSO configuration
- [ ] `/api/teams/[slug]/dsync/*.ts` - Directory sync
- [ ] `/api/teams/[slug]/webhooks/*.ts` - Webhook management
- [ ] `/api/teams/[slug]/payments/*.ts` - Payment endpoints
- [ ] `/api/users.ts` - User management
- [ ] `/api/sessions/*.ts` - Session management

### 2. Update Auth-Related Pages
- [ ] `/auth/forgot-password.tsx` - Use Clerk's password reset
- [ ] `/auth/reset-password/[token].tsx` - Use Clerk's password reset
- [ ] `/auth/magic-link.tsx` - Use Clerk's magic links
- [ ] `/auth/verify-email.tsx` - Use Clerk's email verification
- [ ] `/auth/sso/*.tsx` - Migrate SAML SSO (requires custom Clerk setup)

### 3. Update Components
- [ ] `components/account/*.tsx` - Update all account components
- [ ] `components/auth/*.tsx` - Remove NextAuth components
- [ ] `components/invitation/*.tsx` - Update invitation components
- [ ] `components/team/*.tsx` - Update team management components
- [ ] `components/shared/shell/Header.tsx` - Add Clerk UserButton

### 4. Update Hooks
- [ ] `hooks/useTeam.ts` - Use Clerk organizations
- [ ] `hooks/useTeams.ts` - Use Clerk organizations
- [ ] `hooks/useInvitation.ts` - Update for Clerk
- [ ] `hooks/usePermissions.ts` - Use Clerk roles

### 5. Update Models
- [ ] `models/user.ts` - Update to use Clerk IDs
- [ ] `models/team.ts` - Update to use Clerk organization IDs
- [ ] `models/teamMember.ts` - Update for Clerk memberships

### 6. Clean Up NextAuth
- [ ] Remove NextAuth API routes (`/api/auth/[...nextauth].ts`)
- [ ] Remove NextAuth session provider from `_app.tsx`
- [ ] Remove NextAuth dependencies from `package.json`
- [ ] Remove NextAuth configuration from `lib/nextAuth.ts`
- [ ] Remove NextAuth environment variables

### 7. Update Tests
- [ ] Update E2E tests to use Clerk
- [ ] Update unit tests for Clerk
- [ ] Add tests for Clerk webhook handler
- [ ] Test user migration script

### 8. Special Considerations

#### SAML SSO Migration
- [ ] Set up Clerk Enterprise for SAML support
- [ ] Migrate SAML configurations from Jackson
- [ ] Update SAML callback URLs
- [ ] Test with existing SAML providers

#### API Keys
- [ ] Keep existing API key system (not managed by Clerk)
- [ ] Update API key authentication to verify against Clerk users

#### Webhooks
- [ ] Keep Svix for outgoing webhooks
- [ ] Update webhook events to use Clerk user/org IDs

#### Directory Sync
- [ ] Evaluate Clerk's SCIM support
- [ ] Migrate or maintain Jackson for directory sync

### 9. Data Migration
- [ ] Run user migration script in staging
- [ ] Verify all users migrated correctly
- [ ] Verify team memberships preserved
- [ ] Test with production data copy

### 10. Documentation
- [ ] Update README with Clerk setup instructions
- [ ] Update API documentation
- [ ] Create migration rollback plan
- [ ] Document Clerk dashboard configuration

### 11. Deployment Steps
1. **Staging Deployment**
   - [ ] Deploy with both auth systems
   - [ ] Run migration script
   - [ ] Test all critical paths
   - [ ] Monitor for errors

2. **Production Preparation**
   - [ ] Backup database
   - [ ] Schedule maintenance window
   - [ ] Prepare rollback scripts
   - [ ] Notify users of changes

3. **Production Deployment**
   - [ ] Deploy with feature flags
   - [ ] Run migration in batches
   - [ ] Monitor error rates
   - [ ] Gradual rollout

4. **Post-Deployment**
   - [ ] Remove NextAuth code
   - [ ] Clean up database
   - [ ] Update monitoring
   - [ ] Document lessons learned

## Configuration Checklist

### Clerk Dashboard Setup
- [ ] Configure authentication methods
- [ ] Set up OAuth providers (GitHub, Google)
- [ ] Configure email templates
- [ ] Set up webhook endpoint
- [ ] Configure organization settings
- [ ] Set up custom roles
- [ ] Configure security settings
- [ ] Set up development/staging/production instances

### Environment Variables
- [ ] Set all Clerk environment variables
- [ ] Configure webhook secrets
- [ ] Update redirect URLs
- [ ] Remove NextAuth variables (after full migration)

## Testing Checklist
- [ ] User registration flow
- [ ] User login (all methods)
- [ ] Password reset flow
- [ ] Email verification
- [ ] Team creation
- [ ] Team member invitation
- [ ] Role-based access control
- [ ] API authentication
- [ ] Webhook processing
- [ ] Session management
- [ ] Account deletion

## Rollback Plan
1. Keep NextAuth code in separate branch
2. Database migrations are additive (don't remove NextAuth fields immediately)
3. Use feature flags for gradual rollout
4. Monitor error rates and user feedback
5. Have database backup ready
6. Document rollback SQL scripts