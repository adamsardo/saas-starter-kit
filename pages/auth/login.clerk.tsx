import { SignIn } from '@clerk/nextjs';
import { AuthLayout } from '@/components/layouts';
import type { GetServerSidePropsContext } from 'next';
import { buildClerkProps, getAuth } from '@clerk/nextjs/server';
import env from '@/lib/env';
import { dark } from '@clerk/themes';
import useTheme from 'hooks/useTheme';

export default function LoginPage() {
  const { theme } = useTheme();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          baseTheme: theme === 'dark' ? dark : undefined,
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl',
            headerTitle: 'text-2xl font-bold',
            headerSubtitle: 'text-gray-600 dark:text-gray-400',
            socialButtonsBlockButton: 
              'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
            socialButtonsBlockButtonText: 'font-medium',
            dividerLine: 'bg-gray-300 dark:bg-gray-600',
            dividerText: 'text-gray-500 dark:text-gray-400',
            formFieldLabel: 'text-gray-700 dark:text-gray-300',
            formFieldInput: 
              'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
            formButtonPrimary: 
              'bg-blue-600 hover:bg-blue-700 text-white',
            footerActionLink: 
              'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
            identityPreviewText: 'text-gray-700 dark:text-gray-300',
            identityPreviewEditButtonIcon: 'text-gray-500 dark:text-gray-400',
          },
          layout: {
            socialButtonsPlacement: 'top',
            socialButtonsVariant: 'blockButton',
          },
          variables: {
            colorPrimary: '#3B82F6', // blue-500
            colorDanger: '#EF4444', // red-500
            colorSuccess: '#10B981', // green-500
            colorWarning: '#F59E0B', // yellow-500
            colorTextOnPrimaryBackground: '#FFFFFF',
            colorBackground: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            colorInputBackground: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            colorInputText: theme === 'dark' ? '#FFFFFF' : '#000000',
            borderRadius: '0.375rem', // rounded-md
          },
        }}
        redirectUrl={env.clerk.afterSignInUrl}
        signUpUrl={env.clerk.signUpUrl}
        afterSignInUrl={env.clerk.afterSignInUrl}
      />
    </div>
  );
}

// Handle server-side authentication check
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const { userId } = getAuth(ctx.req);

  // If user is already signed in, redirect to dashboard
  if (userId) {
    return {
      redirect: {
        destination: env.clerk.afterSignInUrl,
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...buildClerkProps(ctx.req),
    },
  };
}

LoginPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AuthLayout>{page}</AuthLayout>;
};