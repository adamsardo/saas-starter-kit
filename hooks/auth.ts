// Barrel export for auth hooks

// Export auth hooks
export { useSession } from './useSession';
export { useSignIn, useSignOut, useAuth } from './useAuth';

// Export Clerk hooks directly for new implementations
export {
  useUser,
  useOrganization,
  useOrganizationList,
  useClerk,
} from '@clerk/nextjs';