import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/router';

export function useCustomSignOut() {
  const router = useRouter();
  const { signOut: clerkSignOut } = useClerk();

  const signOut = async () => {
    try {
      await clerkSignOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  return signOut;
}
