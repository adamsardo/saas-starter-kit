import { Error, Loading } from '@/components/shared';
import { TeamTab } from '@/components/team';
import { Button, Card } from '@/components/shared';
import env from '@/lib/env';
import useTeam from 'hooks/useTeam';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetcher } from '@/lib/common';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { 
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

const sessionSchema = Yup.object().shape({
  patientId: Yup.string().required('Patient is required'),
  sessionType: Yup.string().required('Session type is required'),
  scheduledAt: Yup.string().required('Session date and time is required'),
  duration: Yup.number()
    .min(15, 'Minimum duration is 15 minutes')
    .max(180, 'Maximum duration is 180 minutes')
    .required('Duration is required'),
  notes: Yup.string(),
});

const NewSessionPage = ({ teamFeatures }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();
  const router = useRouter();
  const { patientId: queryPatientId } = router.query;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: patients, error: patientsError } = useSWR<Patient[]>(
    team?.slug ? `/api/teams/${team.slug}/patients?status=ACTIVE` : null,
    fetcher
  );

  // Set default scheduled time to next hour
  const getDefaultScheduledTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={isError.message} />;
  }

  if (!team) {
    return <Error message={t('team-not-found')} />;
  }

  if (!teamFeatures.mentalHealth) {
    return <Error message="Mental health features are not enabled for this team" />;
  }

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${team.slug}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const session = await response.json();
        // Redirect to the session page
        router.push(`/teams/${team.slug}/sessions/${session.id}`);
      } else {
        console.error('Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TeamTab activeTab="sessions" team={team} teamFeatures={teamFeatures} />
      
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/teams/${team.slug}/sessions`}>
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h3 className="text-lg font-semibold">Schedule New Session</h3>
            <p className="text-sm text-gray-500">Create a new therapy session</p>
          </div>
        </div>

        <Card>
          <Card.Body>
            <Formik
              initialValues={{
                patientId: queryPatientId || '',
                sessionType: 'Individual Therapy',
                scheduledAt: getDefaultScheduledTime(),
                duration: 50,
                notes: '',
              }}
              validationSchema={sessionSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, values }) => (
                <Form className="space-y-6">
                  {/* Patient Selection */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">
                        Patient <span className="text-error">*</span>
                      </span>
                    </label>
                    <Field
                      as="select"
                      name="patientId"
                      className={`select select-bordered w-full ${
                        errors.patientId && touched.patientId ? 'select-error' : ''
                      }`}
                    >
                      <option value="">Select a patient</option>
                      {patients?.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </option>
                      ))}
                    </Field>
                    {errors.patientId && touched.patientId && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.patientId}</span>
                      </label>
                    )}
                  </div>

                  {/* Session Type */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">
                        Session Type <span className="text-error">*</span>
                      </span>
                    </label>
                    <Field
                      as="select"
                      name="sessionType"
                      className={`select select-bordered w-full ${
                        errors.sessionType && touched.sessionType ? 'select-error' : ''
                      }`}
                    >
                      <option value="Individual Therapy">Individual Therapy</option>
                      <option value="Group Therapy">Group Therapy</option>
                      <option value="Family Therapy">Family Therapy</option>
                      <option value="Couples Therapy">Couples Therapy</option>
                      <option value="Initial Assessment">Initial Assessment</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Crisis Intervention">Crisis Intervention</option>
                    </Field>
                    {errors.sessionType && touched.sessionType && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.sessionType}</span>
                      </label>
                    )}
                  </div>

                  {/* Date and Time */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">
                        Date & Time <span className="text-error">*</span>
                      </span>
                    </label>
                    <Field
                      type="datetime-local"
                      name="scheduledAt"
                      className={`input input-bordered w-full ${
                        errors.scheduledAt && touched.scheduledAt ? 'input-error' : ''
                      }`}
                    />
                    {errors.scheduledAt && touched.scheduledAt && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.scheduledAt}</span>
                      </label>
                    )}
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">
                        Duration (minutes) <span className="text-error">*</span>
                      </span>
                    </label>
                    <Field
                      as="select"
                      name="duration"
                      className={`select select-bordered w-full ${
                        errors.duration && touched.duration ? 'select-error' : ''
                      }`}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={50}>50 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                      <option value={120}>120 minutes</option>
                    </Field>
                    {errors.duration && touched.duration && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.duration}</span>
                      </label>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">Pre-session Notes</span>
                      <span className="label-text-alt">Optional</span>
                    </label>
                    <Field
                      as="textarea"
                      name="notes"
                      rows={4}
                      className="textarea textarea-bordered w-full"
                      placeholder="Any preparation notes or agenda items for this session..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between pt-4">
                    <Link href={`/teams/${team.slug}/sessions`}>
                      <Button variant="ghost">
                        Cancel
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="outline"
                        loading={isSubmitting}
                        onClick={() => {
                          // After submit, redirect to sessions list
                          (document.activeElement as HTMLElement)?.blur();
                        }}
                      >
                        Save & Close
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        loading={isSubmitting}
                      >
                        <VideoCameraIcon className="w-4 h-4 mr-2" />
                        Save & Start Session
                      </Button>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </Card.Body>
        </Card>
      </div>
    </>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      teamFeatures: env.teamFeatures,
    },
  };
}

export default NewSessionPage;