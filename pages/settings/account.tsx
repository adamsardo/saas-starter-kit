import { UserProfile } from '@clerk/nextjs';
import { AccountLayout } from '@/components/layouts';
import type { GetServerSidePropsContext } from 'next';
import { buildClerkProps, getAuth } from '@clerk/nextjs/server';
import { dark } from '@clerk/themes';
import useTheme from 'hooks/useTheme';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import env from '@/lib/env';

const AccountSettings: NextPageWithLayout = () => {
  const { theme } = useTheme();
  const { t } = useTranslation('common');

  return (
    <div className="mx-auto max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('account-settings')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('manage-your-account-settings-and-preferences')}
          </p>
        </div>
        
        <UserProfile
          appearance={{
            baseTheme: theme === 'dark' ? dark : undefined,
            elements: {
              rootBox: 'w-full shadow-none',
              card: 'shadow-none border border-gray-200 dark:border-gray-700 rounded-lg',
              navbar: 'border-r border-gray-200 dark:border-gray-700',
              navbarMobileMenuButton: 'text-gray-700 dark:text-gray-300',
              pageScrollBox: 'p-6',
              formButtonPrimary: 
                'bg-blue-600 hover:bg-blue-700 text-white',
              formFieldInput: 
                'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
              formFieldLabel: 'text-gray-700 dark:text-gray-300',
              avatarImageActionsUpload: 'text-blue-600 dark:text-blue-400',
              avatarImageActionsRemove: 'text-red-600 dark:text-red-400',
              badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
              profileSectionTitle: 'text-gray-900 dark:text-white',
              profileSectionPrimaryButton: 'text-blue-600 dark:text-blue-400',
              profileSectionContent: 'text-gray-700 dark:text-gray-300',
              accordionTriggerButton: 'text-gray-700 dark:text-gray-300',
              tableHead: 'text-gray-700 dark:text-gray-300',
              tableCell: 'text-gray-700 dark:text-gray-300',
            },
            layout: {
              showOptionalFields: true,
            },
            variables: {
              colorPrimary: '#3B82F6',
              colorDanger: '#EF4444',
              colorSuccess: '#10B981',
              colorWarning: '#F59E0B',
              colorTextOnPrimaryBackground: '#FFFFFF',
              colorBackground: theme === 'dark' ? '#111827' : '#FFFFFF',
              colorInputBackground: theme === 'dark' ? '#1F2937' : '#FFFFFF',
              colorInputText: theme === 'dark' ? '#FFFFFF' : '#000000',
              borderRadius: '0.5rem',
            },
          }}
        />
      </div>
    </div>
  );
};

AccountSettings.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale } = context;
  const { userId } = getAuth(context.req);

  // Require authentication
  if (!userId) {
    return {
      redirect: {
        destination: env.clerk.signInUrl,
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

export default AccountSettings;
