import { useSignIn } from '@/hooks/auth';
import { useRouter } from 'next/router';
import { ReactElement, useEffect } from 'react';

export default function SAMLIdPLogin() {
  const router = useRouter();
  const signIn = useSignIn();

  const { isReady, query } = router;

  useEffect(() => {
    if (!isReady) {
      return;
    }

    signIn('boxyhq-idp', {
      callbackUrl: '/dashboard',
      code: query?.code as string,
    });
  }, [isReady, query, signIn]);

  return null;
}

SAMLIdPLogin.getLayout = function getLayout(page: ReactElement) {
  return <>{page}</>;
};
