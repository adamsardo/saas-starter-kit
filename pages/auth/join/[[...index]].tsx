import { SignUp } from '@clerk/nextjs';
import { AuthLayout } from '@/components/layouts';
import type { GetServerSidePropsContext } from 'next';
import { buildClerkProps, getAuth } from '@clerk/nextjs/server';
import env from '@/lib/env';
import { dark } from '@clerk/themes';
import useTheme from 'hooks/useTheme';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';

const Join: NextPageWithLayout = () => {
  const { theme } = useTheme();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
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
            formFieldInputShowPasswordButton: 'text-gray-500 dark:text-gray-400',
            formFieldInputShowPasswordIcon: 'text-gray-500 dark:text-gray-400',
          },
          layout: {
            socialButtonsPlacement: 'top',
            socialButtonsVariant: 'blockButton',
          },
          variables: {
            colorPrimary: '#3B82F6',
            colorDanger: '#EF4444',
            colorSuccess: '#10B981',
            colorWarning: '#F59E0B',
            colorTextOnPrimaryBackground: '#FFFFFF',
            colorBackground: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            colorInputBackground: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            colorInputText: theme === 'dark' ? '#FFFFFF' : '#000000',
            borderRadius: '0.375rem',
          },
        }}
        redirectUrl={env.clerk.afterSignUpUrl}
        signInUrl={env.clerk.signInUrl}
        afterSignUpUrl={env.clerk.afterSignUpUrl}
      />
    </div>
  );
};

Join.getLayout = function getLayout(page: ReactElement) {
  return (
    <AuthLayout heading="create-account" description="sign-up-for-free">
      {page}
    </AuthLayout>
  );
};

// Handle server-side authentication check
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale } = context;
  const { userId } = getAuth(context.req);

  // If user is already signed in, redirect to dashboard
  if (userId) {
    return {
      redirect: {
        destination: env.clerk.afterSignUpUrl,
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      ...buildClerkProps(context.req),
    },
  };
}

export default Join; 