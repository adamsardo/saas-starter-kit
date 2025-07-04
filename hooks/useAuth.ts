import { useSignIn as useClerkSignIn, useSignUp, useClerk, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import env from '@/lib/env';

// Hook for handling sign in with various providers
export function useSignIn() {
  const { signIn: clerkSignIn, setActive } = useClerkSignIn() || {};
  const router = useRouter();

  const signIn = async (
    provider?: string,
    options?: {
      callbackUrl?: string;
      redirect?: boolean;
      email?: string;
      code?: string;
    }
  ) => {
    try {
      if (provider === 'credentials' && options?.email) {
        // Handle credentials sign in
        const result = await clerkSignIn?.create({
          identifier: options.email,
          strategy: 'password',
        });
        
        if (result?.status === 'complete' && setActive) {
          await setActive({ session: result.createdSessionId });
          if (options?.callbackUrl) {
            router.push(options.callbackUrl);
          }
        }
      } else if (provider === 'google') {
        // Handle Google OAuth
        await clerkSignIn?.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: options?.callbackUrl || env.clerk.afterSignInUrl,
          redirectUrlComplete: options?.callbackUrl || env.clerk.afterSignInUrl,
        });
      } else if (provider === 'github') {
        // Handle GitHub OAuth
        await clerkSignIn?.authenticateWithRedirect({
          strategy: 'oauth_github',
          redirectUrl: options?.callbackUrl || env.clerk.afterSignInUrl,
          redirectUrlComplete: options?.callbackUrl || env.clerk.afterSignInUrl,
        });
      } else if (provider === 'email') {
        // Handle magic link
        await clerkSignIn?.create({
          identifier: options?.email || '',
          strategy: 'email_link',
          redirectUrl: options?.callbackUrl || env.clerk.afterSignInUrl,
        });
      } else if (provider === 'boxyhq-saml' || provider === 'boxyhq-idp') {
        // For SAML/IdP, redirect to custom handler
        router.push(`/auth/sso?callbackUrl=${encodeURIComponent(options?.callbackUrl || env.clerk.afterSignInUrl)}`);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  return signIn;
}

// Wrapper for signOut
export function useSignOut() {
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();

  const signOut = async (options?: { callbackUrl?: string }) => {
    try {
      await clerkSignOut();
      if (options?.callbackUrl) {
        router.push(options.callbackUrl);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return signOut;
}

// Re-export Clerk's useAuth with our naming
export const useAuth = useClerkAuth;