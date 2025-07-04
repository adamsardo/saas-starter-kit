import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

import { UpdatePassword } from '@/components/account';
import ManageSessions from '@/components/account/ManageSessions';
import { getSession } from '@/lib/session';

const Security = () => {
  const { t } = useTranslation('common');

  return (
    <div className="flex gap-10 flex-col">
      <UpdatePassword />
      <ManageSessions />
    </div>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default Security;
