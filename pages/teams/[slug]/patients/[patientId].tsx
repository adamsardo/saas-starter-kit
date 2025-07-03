import { Error, Loading } from '@/components/shared';
import { TeamTab } from '@/components/team';
import { Button, Card, Badge, Modal } from '@/components/shared';
import env from '@/lib/env';
import useTeam from 'hooks/useTeam';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetcher } from '@/lib/common';
import Link from 'next/link';
import { useState } from 'react';
import { Tab } from '@headlessui/react';
import classNames from 'classnames';
import { 
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon,
  ClockIcon,
  ChartBarIcon,
  PencilIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  HomeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';

interface PatientDetails {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  medicalRecordNumber?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCHARGED';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTherapist?: {
    id: string;
    name: string;
    title: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  diagnoses?: Array<{
    code: string;
    description: string;
    dateAdded: string;
    isPrimary: boolean;
  }>;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    prescribedBy: string;
    startDate: string;
  }>;
  sessions?: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    sessionType: string;
    duration?: number;
    clinicalNotes?: boolean;
  }>;
  treatmentPlans?: Array<{
    id: string;
    startDate: string;
    endDate?: string;
    goals: Array<{
      description: string;
      targetDate: string;
      status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
    }>;
  }>;
  riskAssessments?: Array<{
    id: string;
    assessmentDate: string;
    riskLevel: string;
    factors: string[];
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const RiskBadge = ({ level }: { level?: string }) => {
  if (!level) return null;
  
  const config = {
    LOW: { color: 'badge-success', text: 'Low Risk' },
    MEDIUM: { color: 'badge-warning', text: 'Medium Risk' },
    HIGH: { color: 'badge-error', text: 'High Risk' },
  };

  const badgeConfig = config[level as keyof typeof config];
  if (!badgeConfig) return null;

  return <Badge className={badgeConfig.color}>{badgeConfig.text}</Badge>;
};

const PatientDetailsPage = ({ teamFeatures }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();
  const router = useRouter();
  const { patientId } = router.query;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  
  const { data: patient, error: patientError, mutate } = useSWR<PatientDetails>(
    team?.slug && patientId ? `/api/teams/${team.slug}/patients/${patientId}` : null,
    fetcher
  );

  if (isLoading || !patient) {
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

  const recentSessions = patient.sessions?.slice(0, 5) || [];
  const upcomingSessions = patient.sessions?.filter(s => 
    s.status === 'SCHEDULED' && new Date(s.scheduledAt) > new Date()
  ) || [];
  
  const handleDischarge = async () => {
    try {
      const response = await fetch(`/api/teams/${team.slug}/patients/${patientId}/discharge`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await mutate();
        setShowDischargeModal(false);
      }
    } catch (error) {
      console.error('Failed to discharge patient:', error);
    }
  };

  return (
    <>
      <TeamTab activeTab="patients" team={team} teamFeatures={teamFeatures} />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/teams/${team.slug}/patients`}>
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h3 className="text-2xl font-semibold flex items-center gap-3">
              {patient.firstName} {patient.lastName}
              {patient.status === 'ACTIVE' && (
                <Badge variant="success">Active</Badge>
              )}
              {patient.status === 'DISCHARGED' && (
                <Badge variant="ghost">Discharged</Badge>
              )}
              <RiskBadge level={patient.riskLevel} />
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              {patient.medicalRecordNumber && (
                <span>MRN: {patient.medicalRecordNumber}</span>
              )}
              <span>DOB: {format(new Date(patient.dateOfBirth), 'PP')}</span>
              <span>Added: {formatDistanceToNow(new Date(patient.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/teams/${team.slug}/sessions/new?patientId=${patient.id}`}>
            <Button variant="primary" size="sm">
              <VideoCameraIcon className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <PencilIcon className="w-4 h-4" />
          </Button>
          {patient.status === 'ACTIVE' && (
            <Button variant="outline" size="sm" onClick={() => setShowDischargeModal(true)}>
              <ArchiveBoxIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-base-200 p-1 mb-6">
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-primary focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white text-primary shadow'
                  : 'text-base-content hover:bg-white/[0.12] hover:text-primary'
              )
            }
          >
            Overview
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-primary focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white text-primary shadow'
                  : 'text-base-content hover:bg-white/[0.12] hover:text-primary'
              )
            }
          >
            Sessions
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-primary focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white text-primary shadow'
                  : 'text-base-content hover:bg-white/[0.12] hover:text-primary'
              )
            }
          >
            Treatment Plans
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-primary focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white text-primary shadow'
                  : 'text-base-content hover:bg-white/[0.12] hover:text-primary'
              )
            }
          >
            Risk Assessments
          </Tab>
        </Tab.List>
        
        <Tab.Panels>
          {/* Overview Tab */}
          <Tab.Panel className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contact Information */}
              <Card>
                <Card.Body>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Contact Information
                  </h4>
                  <dl className="space-y-3 text-sm">
                    {patient.email && (
                      <div>
                        <dt className="text-gray-500">Email</dt>
                        <dd className="flex items-center gap-2">
                          <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                          {patient.email}
                        </dd>
                      </div>
                    )}
                    {patient.phone && (
                      <div>
                        <dt className="text-gray-500">Phone</dt>
                        <dd className="flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4 text-gray-400" />
                          {patient.phone}
                        </dd>
                      </div>
                    )}
                    {patient.address && (
                      <div>
                        <dt className="text-gray-500">Address</dt>
                        <dd className="flex items-start gap-2">
                          <HomeIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            {patient.address.street && <div>{patient.address.street}</div>}
                            {(patient.address.city || patient.address.state || patient.address.zipCode) && (
                              <div>
                                {patient.address.city}{patient.address.city && patient.address.state && ', '}
                                {patient.address.state} {patient.address.zipCode}
                              </div>
                            )}
                          </div>
                        </dd>
                      </div>
                    )}
                  </dl>
                </Card.Body>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <Card.Body>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    Emergency Contact
                  </h4>
                  {patient.emergencyContact ? (
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-gray-500">Name</dt>
                        <dd>{patient.emergencyContact.name}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Relationship</dt>
                        <dd>{patient.emergencyContact.relationship}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Phone</dt>
                        <dd className="flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4 text-gray-400" />
                          {patient.emergencyContact.phone}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-500">No emergency contact on file</p>
                  )}
                </Card.Body>
              </Card>

              {/* Insurance */}
              <Card>
                <Card.Body>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5" />
                    Insurance Information
                  </h4>
                  {patient.insurance ? (
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-gray-500">Provider</dt>
                        <dd>{patient.insurance.provider}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Policy Number</dt>
                        <dd>{patient.insurance.policyNumber}</dd>
                      </div>
                      {patient.insurance.groupNumber && (
                        <div>
                          <dt className="text-gray-500">Group Number</dt>
                          <dd>{patient.insurance.groupNumber}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-500">No insurance information on file</p>
                  )}
                </Card.Body>
              </Card>
            </div>

            {/* Clinical Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Diagnoses */}
              <Card>
                <Card.Body>
                  <h4 className="font-semibold mb-4">Current Diagnoses</h4>
                  {patient.diagnoses && patient.diagnoses.length > 0 ? (
                    <div className="space-y-3">
                      {patient.diagnoses.map((diagnosis, index) => (
                        <div key={index} className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {diagnosis.code} - {diagnosis.description}
                              {diagnosis.isPrimary && (
                                <Badge variant="primary" size="sm" className="ml-2">Primary</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              Added {format(new Date(diagnosis.dateAdded), 'PP')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No diagnoses recorded</p>
                  )}
                </Card.Body>
              </Card>

              {/* Medications */}
              <Card>
                <Card.Body>
                  <h4 className="font-semibold mb-4">Current Medications</h4>
                  {patient.medications && patient.medications.length > 0 ? (
                    <div className="space-y-3">
                      {patient.medications.map((medication, index) => (
                        <div key={index}>
                          <div className="font-medium">{medication.name}</div>
                          <div className="text-sm text-gray-500">
                            {medication.dosage} - {medication.frequency}
                          </div>
                          <div className="text-sm text-gray-500">
                            Prescribed by {medication.prescribedBy}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No medications recorded</p>
                  )}
                </Card.Body>
              </Card>
            </div>

            {/* Care Team */}
            <Card>
              <Card.Body>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5" />
                  Care Team
                </h4>
                {patient.assignedTherapist ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{patient.assignedTherapist.name}</div>
                      <div className="text-sm text-gray-500">{patient.assignedTherapist.title}</div>
                    </div>
                    <Button variant="outline" size="sm">
                      Send Message
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No therapist assigned</p>
                )}
              </Card.Body>
            </Card>
          </Tab.Panel>
          
          {/* Sessions Tab */}
          <Tab.Panel>
            <div className="space-y-6">
              {/* Upcoming Sessions */}
              {upcomingSessions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Upcoming Sessions</h4>
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <Card key={session.id}>
                        <Card.Body className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{session.sessionType}</div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(session.scheduledAt), 'PPp')}
                              </div>
                            </div>
                            <Link href={`/teams/${team.slug}/sessions/${session.id}`}>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              <div>
                <h4 className="font-semibold mb-3">Session History</h4>
                {recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.map((session) => (
                      <Card key={session.id}>
                        <Card.Body className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{session.sessionType}</span>
                                <Badge variant={session.status === 'COMPLETED' ? 'success' : 'ghost'} size="sm">
                                  {session.status}
                                </Badge>
                                {session.clinicalNotes && (
                                  <Badge variant="info" size="sm">Has Notes</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {format(new Date(session.scheduledAt), 'PPp')}
                                {session.duration && ` • ${session.duration} minutes`}
                              </div>
                            </div>
                            <Link href={`/teams/${team.slug}/sessions/${session.id}`}>
                              <Button variant="outline" size="sm">
                                Review
                              </Button>
                            </Link>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <Card.Body className="text-center py-8">
                      <VideoCameraIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">No sessions recorded yet</p>
                    </Card.Body>
                  </Card>
                )}
              </div>
            </div>
          </Tab.Panel>
          
          {/* Treatment Plans Tab */}
          <Tab.Panel>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Treatment Plans</h4>
                <Button variant="primary" size="sm">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Plan
                </Button>
              </div>
              
              {patient.treatmentPlans && patient.treatmentPlans.length > 0 ? (
                patient.treatmentPlans.map((plan) => (
                  <Card key={plan.id}>
                    <Card.Body>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h5 className="font-medium">
                            Treatment Plan
                            {!plan.endDate && <Badge variant="success" className="ml-2">Active</Badge>}
                          </h5>
                          <p className="text-sm text-gray-500">
                            {format(new Date(plan.startDate), 'PP')} - {plan.endDate ? format(new Date(plan.endDate), 'PP') : 'Present'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <h6 className="text-sm font-medium">Goals:</h6>
                        {plan.goals.map((goal, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className={`mt-1 w-4 h-4 rounded-full ${
                              goal.status === 'COMPLETED' ? 'bg-success' : 
                              goal.status === 'ACTIVE' ? 'bg-warning' : 'bg-gray-300'
                            }`} />
                            <div className="flex-1">
                              <p className="text-sm">{goal.description}</p>
                              <p className="text-xs text-gray-500">
                                Target: {format(new Date(goal.targetDate), 'PP')}
                              </p>
                            </div>
                            <Badge variant={
                              goal.status === 'COMPLETED' ? 'success' : 
                              goal.status === 'ACTIVE' ? 'warning' : 'ghost'
                            } size="sm">
                              {goal.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <Card>
                  <Card.Body className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No treatment plans created yet</p>
                  </Card.Body>
                </Card>
              )}
            </div>
          </Tab.Panel>
          
          {/* Risk Assessments Tab */}
          <Tab.Panel>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Risk Assessments</h4>
                <Button variant="primary" size="sm">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Assessment
                </Button>
              </div>
              
              {patient.riskAssessments && patient.riskAssessments.length > 0 ? (
                patient.riskAssessments.map((assessment) => (
                  <Card key={assessment.id}>
                    <Card.Body>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h5 className="font-medium">Risk Assessment</h5>
                            <RiskBadge level={assessment.riskLevel} />
                          </div>
                          <p className="text-sm text-gray-500">
                            {format(new Date(assessment.assessmentDate), 'PPp')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h6 className="text-sm font-medium mb-2">Risk Factors:</h6>
                          <div className="flex flex-wrap gap-2">
                            {assessment.factors.map((factor, index) => (
                              <Badge key={index} variant="ghost" size="sm">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {assessment.notes && (
                          <div>
                            <h6 className="text-sm font-medium mb-1">Notes:</h6>
                            <p className="text-sm text-gray-600">{assessment.notes}</p>
                          </div>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <Card>
                  <Card.Body className="text-center py-8">
                    <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No risk assessments recorded</p>
                  </Card.Body>
                </Card>
              )}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Discharge Modal */}
      <Modal open={showDischargeModal} onClose={() => setShowDischargeModal(false)}>
        <Modal.Header>Discharge Patient</Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to discharge {patient.firstName} {patient.lastName}?</p>
          <p className="text-sm text-gray-500 mt-2">
            This action will mark the patient as discharged and end active treatment. 
            The patient record will be retained for historical purposes.
          </p>
        </Modal.Body>
        <Modal.Actions>
          <Button variant="ghost" onClick={() => setShowDischargeModal(false)}>
            Cancel
          </Button>
          <Button variant="error" onClick={handleDischarge}>
            Discharge Patient
          </Button>
        </Modal.Actions>
      </Modal>
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

export default PatientDetailsPage;