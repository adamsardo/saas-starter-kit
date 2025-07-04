import { useState } from 'react';
import { Loading } from '@/components/shared';
import { useSession } from '@/hooks/auth';
import React from 'react';
import Header from './Header';
import Drawer from './Drawer';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function AppShell({ children }) {
  const router = useRouter();
  const { status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoaded: clerkLoaded, isSignedIn, user } = useUser();

  // Check authentication status
  const isLoading = clerkLoaded === false || (clerkLoaded && !user && status === 'loading');
  const isAuthenticated = user || status === 'authenticated';

  if (status === 'loading') {
    return <Loading />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return;
  }

  return (
    <div>
      <Drawer sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Header setSidebarOpen={setSidebarOpen} />

      <main className="py-4 lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
