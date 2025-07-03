import { Error, Loading } from '@/components/shared';
import { TeamTab } from '@/components/team';
import { Button, Card } from '@/components/shared';
import env from '@/lib/env';
import useTeam from 'hooks/useTeam';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { 
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const patientSchema = Yup.object().shape({
  // Basic Information
  firstName: Yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: Yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: Yup.date()
    .required('Date of birth is required')
    .max(new Date(), 'Date of birth cannot be in the future'),
  gender: Yup.string().required('Gender is required'),
  
  // Contact Information
  email: Yup.string().email('Invalid email address'),
  phone: Yup.string().matches(
    /^[\d\s\-\+\(\)]+$/,
    'Invalid phone number'
  ),
  
  // Address
  address: Yup.object().shape({
    street: Yup.string(),
    city: Yup.string(),
    state: Yup.string(),
    zipCode: Yup.string(),
  }),
  
  // Emergency Contact
  emergencyContact: Yup.object().shape({
    name: Yup.string().required('Emergency contact name is required'),
    relationship: Yup.string().required('Relationship is required'),
    phone: Yup.string()
      .required('Emergency contact phone is required')
      .matches(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number'),
  }),
  
  // Insurance
  insurance: Yup.object().shape({
    provider: Yup.string(),
    policyNumber: Yup.string(),
    groupNumber: Yup.string(),
  }),
  
  // Clinical
  primaryDiagnosis: Yup.string(),
  referralSource: Yup.string(),
  reasonForReferral: Yup.string(),
});

const NewPatientPage = ({ teamFeatures }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

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
      const response = await fetch(`/api/teams/${team.slug}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const patient = await response.json();
        // Redirect to the patient page
        router.push(`/teams/${team.slug}/patients/${patient.id}`);
      } else {
        console.error('Failed to create patient');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, name: 'Basic Information', icon: UserIcon },
    { id: 2, name: 'Contact Details', icon: PhoneIcon },
    { id: 3, name: 'Emergency & Insurance', icon: ShieldCheckIcon },
    { id: 4, name: 'Clinical Information', icon: DocumentTextIcon },
  ];

  return (
    <>
      <TeamTab activeTab="patients" team={team} teamFeatures={teamFeatures} />
      
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/teams/${team.slug}/patients`}>
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h3 className="text-lg font-semibold">New Patient Registration</h3>
            <p className="text-sm text-gray-500">Register a new patient in the system</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, stepIdx) => (
                <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    {stepIdx !== steps.length - 1 && (
                      <div className={`h-0.5 w-full ${currentStep > step.id ? 'bg-primary' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                      currentStep === step.id
                        ? 'bg-primary text-white'
                        : currentStep > step.id
                        ? 'bg-primary text-white'
                        : 'bg-white border-2 border-gray-300 text-gray-500'
                    }`}
                  >
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">{step.name}</span>
                  </button>
                  <span className="absolute -bottom-6 text-xs text-gray-500 whitespace-nowrap">
                    {step.name}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <Card className="mt-12">
          <Card.Body>
            <Formik
              initialValues={{
                // Basic Information
                firstName: '',
                lastName: '',
                dateOfBirth: '',
                gender: '',
                
                // Contact Information
                email: '',
                phone: '',
                address: {
                  street: '',
                  city: '',
                  state: '',
                  zipCode: '',
                },
                
                // Emergency Contact
                emergencyContact: {
                  name: '',
                  relationship: '',
                  phone: '',
                },
                
                // Insurance
                insurance: {
                  provider: '',
                  policyNumber: '',
                  groupNumber: '',
                },
                
                // Clinical
                primaryDiagnosis: '',
                referralSource: '',
                reasonForReferral: '',
              }}
              validationSchema={patientSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, values }) => (
                <Form className="space-y-6">
                  {/* Step 1: Basic Information */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <h4 className="font-semibold text-lg mb-4">Basic Information</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">
                            <span className="label-text font-medium">
                              First Name <span className="text-error">*</span>
                            </span>
                          </label>
                          <Field
                            type="text"
                            name="firstName"
                            className={`input input-bordered w-full ${
                              errors.firstName && touched.firstName ? 'input-error' : ''
                            }`}
                          />
                          {errors.firstName && touched.firstName && (
                            <label className="label">
                              <span className="label-text-alt text-error">{errors.firstName}</span>
                            </label>
                          )}
                        </div>

                        <div>
                          <label className="label">
                            <span className="label-text font-medium">
                              Last Name <span className="text-error">*</span>
                            </span>
                          </label>
                          <Field
                            type="text"
                            name="lastName"
                            className={`input input-bordered w-full ${
                              errors.lastName && touched.lastName ? 'input-error' : ''
                            }`}
                          />
                          {errors.lastName && touched.lastName && (
                            <label className="label">
                              <span className="label-text-alt text-error">{errors.lastName}</span>
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">
                            <span className="label-text font-medium">
                              Date of Birth <span className="text-error">*</span>
                            </span>
                          </label>
                          <Field
                            type="date"
                            name="dateOfBirth"
                            className={`input input-bordered w-full ${
                              errors.dateOfBirth && touched.dateOfBirth ? 'input-error' : ''
                            }`}
                          />
                          {errors.dateOfBirth && touched.dateOfBirth && (
                            <label className="label">
                              <span className="label-text-alt text-error">{errors.dateOfBirth}</span>
                            </label>
                          )}
                        </div>

                        <div>
                          <label className="label">
                            <span className="label-text font-medium">
                              Gender <span className="text-error">*</span>
                            </span>
                          </label>
                          <Field
                            as="select"
                            name="gender"
                            className={`select select-bordered w-full ${
                              errors.gender && touched.gender ? 'select-error' : ''
                            }`}
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </Field>
                          {errors.gender && touched.gender && (
                            <label className="label">
                              <span className="label-text-alt text-error">{errors.gender}</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Contact Details */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <h4 className="font-semibold text-lg mb-4">Contact Details</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">
                            <span className="label-text font-medium">Email</span>
                          </label>
                          <Field
                            type="email"
                            name="email"
                            className={`input input-bordered w-full ${
                              errors.email && touched.email ? 'input-error' : ''
                            }`}
                            placeholder="patient@example.com"
                          />
                          {errors.email && touched.email && (
                            <label className="label">
                              <span className="label-text-alt text-error">{errors.email}</span>
                            </label>
                          )}
                        </div>

                        <div>
                          <label className="label">
                            <span className="label-text font-medium">Phone</span>
                          </label>
                          <Field
                            type="tel"
                            name="phone"
                            className={`input input-bordered w-full ${
                              errors.phone && touched.phone ? 'input-error' : ''
                            }`}
                            placeholder="(555) 123-4567"
                          />
                          {errors.phone && touched.phone && (
                            <label className="label">
                              <span className="label-text-alt text-error">{errors.phone}</span>
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h5 className="font-medium">Address</h5>
                        
                        <div>
                          <label className="label">
                            <span className="label-text">Street Address</span>
                          </label>
                          <Field
                            type="text"
                            name="address.street"
                            className="input input-bordered w-full"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="label">
                              <span className="label-text">City</span>
                            </label>
                            <Field
                              type="text"
                              name="address.city"
                              className="input input-bordered w-full"
                            />
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text">State</span>
                            </label>
                            <Field
                              type="text"
                              name="address.state"
                              className="input input-bordered w-full"
                            />
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text">ZIP Code</span>
                            </label>
                            <Field
                              type="text"
                              name="address.zipCode"
                              className="input input-bordered w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Emergency & Insurance */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-lg mb-4">Emergency Contact</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="label">
                              <span className="label-text font-medium">
                                Contact Name <span className="text-error">*</span>
                              </span>
                            </label>
                            <Field
                              type="text"
                              name="emergencyContact.name"
                              className={`input input-bordered w-full ${
                                errors.emergencyContact?.name && touched.emergencyContact?.name ? 'input-error' : ''
                              }`}
                            />
                            {errors.emergencyContact?.name && touched.emergencyContact?.name && (
                              <label className="label">
                                <span className="label-text-alt text-error">{errors.emergencyContact.name}</span>
                              </label>
                            )}
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text font-medium">
                                Relationship <span className="text-error">*</span>
                              </span>
                            </label>
                            <Field
                              type="text"
                              name="emergencyContact.relationship"
                              className={`input input-bordered w-full ${
                                errors.emergencyContact?.relationship && touched.emergencyContact?.relationship ? 'input-error' : ''
                              }`}
                              placeholder="e.g., Spouse, Parent, Sibling"
                            />
                            {errors.emergencyContact?.relationship && touched.emergencyContact?.relationship && (
                              <label className="label">
                                <span className="label-text-alt text-error">{errors.emergencyContact.relationship}</span>
                              </label>
                            )}
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text font-medium">
                                Phone <span className="text-error">*</span>
                              </span>
                            </label>
                            <Field
                              type="tel"
                              name="emergencyContact.phone"
                              className={`input input-bordered w-full ${
                                errors.emergencyContact?.phone && touched.emergencyContact?.phone ? 'input-error' : ''
                              }`}
                              placeholder="(555) 123-4567"
                            />
                            {errors.emergencyContact?.phone && touched.emergencyContact?.phone && (
                              <label className="label">
                                <span className="label-text-alt text-error">{errors.emergencyContact.phone}</span>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-lg mb-4">Insurance Information</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="label">
                              <span className="label-text font-medium">Insurance Provider</span>
                            </label>
                            <Field
                              type="text"
                              name="insurance.provider"
                              className="input input-bordered w-full"
                              placeholder="e.g., Blue Cross Blue Shield"
                            />
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text font-medium">Policy Number</span>
                            </label>
                            <Field
                              type="text"
                              name="insurance.policyNumber"
                              className="input input-bordered w-full"
                            />
                          </div>

                          <div>
                            <label className="label">
                              <span className="label-text font-medium">Group Number</span>
                            </label>
                            <Field
                              type="text"
                              name="insurance.groupNumber"
                              className="input input-bordered w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Clinical Information */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <h4 className="font-semibold text-lg mb-4">Clinical Information</h4>
                      
                      <div>
                        <label className="label">
                          <span className="label-text font-medium">Primary Diagnosis (if known)</span>
                        </label>
                        <Field
                          type="text"
                          name="primaryDiagnosis"
                          className="input input-bordered w-full"
                          placeholder="e.g., F32.1 Major depressive disorder, single episode, moderate"
                        />
                      </div>

                      <div>
                        <label className="label">
                          <span className="label-text font-medium">Referral Source</span>
                        </label>
                        <Field
                          type="text"
                          name="referralSource"
                          className="input input-bordered w-full"
                          placeholder="e.g., Dr. Smith, Self-referral, Insurance"
                        />
                      </div>

                      <div>
                        <label className="label">
                          <span className="label-text font-medium">Reason for Referral</span>
                        </label>
                        <Field
                          as="textarea"
                          name="reasonForReferral"
                          rows={4}
                          className="textarea textarea-bordered w-full"
                          placeholder="Brief description of presenting concerns..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between pt-6 border-t">
                    <div>
                      {currentStep > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep(currentStep - 1)}
                        >
                          Previous
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Link href={`/teams/${team.slug}/patients`}>
                        <Button variant="ghost">
                          Cancel
                        </Button>
                      </Link>
                      
                      {currentStep < 4 ? (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => setCurrentStep(currentStep + 1)}
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          variant="primary"
                          loading={isSubmitting}
                        >
                          Register Patient
                        </Button>
                      )}
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

export default NewPatientPage;