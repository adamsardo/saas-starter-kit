import { InputWithLabel, Loading } from '@/components/shared';
import { maxLengthPolicies } from '@/lib/common';
import env from '@/lib/env';
import { useFormik } from 'formik';
import useInvitation from 'hooks/useInvitation';
import { useSignIn, useSession } from '@/hooks/auth';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

interface MagicLinkProps {
  csrfToken: string | undefined;
}

const MagicLink = ({ csrfToken }: MagicLinkProps) => {
  const { t } = useTranslation('common');
  const signIn = useSignIn();
  const { status } = useSession();
  const router = useRouter();
  const { invitation } = useInvitation();
  const redirectUrl = invitation
    ? `/invitations/${invitation.token}`
    : env.redirectIfAuthenticated;

  const params = invitation ? `?token=${invitation.token}` : '';

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: Yup.object().shape({
      email: Yup.string().required().email().max(maxLengthPolicies.email),
    }),
    onSubmit: async (values) => {
      try {
        await signIn('email', {
          email: values.email,
          redirect: false,
          callbackUrl: redirectUrl,
        });

        formik.resetForm();
        
        toast.success(t('magic-link-sent'));
      } catch (error: any) {
        toast.error(error.message || t('magic-link-error'));
      }
    },
  });

  if (status === 'loading') {
    return <Loading />;
  }

  if (status === 'authenticated') {
    router.push(env.redirectIfAuthenticated);
  }

  return (
    <>
      <Head>
        <title>{t('magic-link-title')}</title>
      </Head>
      <div className="rounded p-6 border">
        <form onSubmit={formik.handleSubmit}>
          <div className="space-y-2">
            <InputWithLabel
              type="email"
              label="Email"
              name="email"
              placeholder="jackson@boxyhq.com"
              value={formik.values.email}
              descriptionText="We'll email you a magic link for a password-free sign in."
              error={formik.touched.email ? formik.errors.email : undefined}
              onChange={formik.handleChange}
            />
            <Button
              type="submit"
              color="primary"
              loading={formik.isSubmitting}
              active={formik.dirty}
              fullWidth
              size="md"
            >
              {t('send-magic-link')}
            </Button>
          </div>
        </form>
        <div className="divider"></div>
        <div className="space-y-3">
          <Link
            href={`/auth/login/${params}`}
            className="btn btn-outline w-full"
          >
            &nbsp;{t('sign-in-with-password')}
          </Link>
          <Link href="/auth/sso" className="btn btn-outline w-full">
            &nbsp;{t('continue-with-saml-sso')}
          </Link>
        </div>
      </div>
      <p className="text-center text-sm text-gray-600 mt-3">
        {t('dont-have-an-account')}
        <Link
          href={`/auth/join${params}`}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          &nbsp;{t('create-a-free-account')}
        </Link>
      </p>
    </>
  );
};

export default MagicLink;
