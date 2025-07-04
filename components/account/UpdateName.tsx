import { InputWithLabel } from '@/components/shared';
import { Card } from '@/components/shared';
import { useTranslation } from 'next-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import { useSession, useUser } from '@/hooks/auth';
import { ApiResponse } from 'types';
import { maxLengthPolicies } from '@/lib/common';

const UpdateName = ({ user }: { user: any }) => {
  const { t } = useTranslation('common');
  const { update } = useSession();
  const { user: clerkUser } = useUser();
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: user.name || '',
    },
    validationSchema: Yup.object().shape({
      name: Yup.string()
        .max(maxLengthPolicies.name)
        .required(t('name-required')),
    }),
    enableReinitialize: true,
    onSubmit: async (values) => {
      setLoading(true);

      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      setLoading(false);

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        toast.error(json.error.message);
        return;
      }

      // Update Clerk user profile
      if (clerkUser) {
        try {
          await clerkUser.update({
            firstName: values.name.split(' ')[0],
            lastName: values.name.split(' ').slice(1).join(' '),
          });
        } catch (error) {
          console.error('Failed to update Clerk profile:', error);
        }
      }

      toast.success(t('successfully-updated'));
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card>
        <Card.Body>
          <Card.Header>
            <Card.Title>{t('name')}</Card.Title>
            <Card.Description>{t('name-appearance')}</Card.Description>
          </Card.Header>
          <InputWithLabel
            type="text"
            name="name"
            label={t('name')}
            placeholder={t('your-name')}
            value={formik.values.name}
            onChange={formik.handleChange}
            className="w-full max-w-md"
            required
          />
        </Card.Body>
        <Card.Footer>
          <Button
            type="submit"
            color="primary"
            loading={loading}
            disabled={!formik.dirty || !formik.isValid}
            size="md"
          >
            {t('save-changes')}
          </Button>
        </Card.Footer>
      </Card>
    </form>
  );
};

export default UpdateName;
