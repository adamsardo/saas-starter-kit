import { Error, Loading } from '@/components/shared';
import { TeamTab } from '@/components/team';
import { SessionRecording } from '@/components/mentalHealth/SessionRecording';
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
import { 
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  VideoCameraIcon,
  DocumentArrowDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Tab } from '@headlessui/react';
import classNames from 'classnames';

interface SessionDetails {
  id: string;
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    medicalRecordNumber?: string;
  };
  therapist: {
    id: string;
    name: string;
    title: string;
  };
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sessionType: string;
  duration?: number;
  transcript?: string;
  clinicalNotes?: {
    id: string;
    type: string;
    content: any;
    createdAt: string;
  }[];
  clinicalFlags?: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    timestamp: number;
  }>;
}

const SessionPage = ({ teamFeatures }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();
  const router = useRouter();
  const { sessionId } = router.query;
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatingDocument, setGeneratingDocument] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('soap');
  
  const { data: session, error: sessionError, mutate } = useSWR<SessionDetails>(
    team?.slug && sessionId ? `/api/teams/${team.slug}/sessions/${sessionId}` : null,
    fetcher
  );

  if (isLoading || !session) {
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

  const handleSessionComplete = async () => {
    // Refresh session data
    await mutate();
    // Optionally redirect to sessions list
    router.push(`/teams/${team.slug}/sessions`);
  };

  const handleGenerateDocument = async (type: string) => {
    setGeneratingDocument(true);
    try {
      const response = await fetch(`/api/teams/${team.slug}/sessions/${sessionId}/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: type }),
      });
      
      if (response.ok) {
        await mutate();
        setShowGenerateModal(false);
      }
    } catch (error) {
      console.error('Failed to generate document:', error);
    } finally {
      setGeneratingDocument(false);
    }
  };

  const isActive = session.status === 'IN_PROGRESS' || session.status === 'SCHEDULED';
  const hasTranscript = session.transcript && session.transcript.length > 0;
  const hasClinicalNotes = session.clinicalNotes && session.clinicalNotes.length > 0;

  return (
    <>
      <TeamTab activeTab="sessions" team={team} teamFeatures={teamFeatures} />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/teams/${team.slug}/sessions`}>
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {session.sessionType} Session
              {session.status === 'IN_PROGRESS' && (
                <Badge variant="warning">In Progress</Badge>
              )}
              {session.status === 'COMPLETED' && (
                <Badge variant="success">Completed</Badge>
              )}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                {session.patient.firstName} {session.patient.lastName}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {format(new Date(session.scheduledAt), 'PPp')}
              </span>
              {session.duration && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {session.duration} minutes
                </span>
              )}
            </div>
          </div>
        </div>
        
        {session.status === 'COMPLETED' && !hasClinicalNotes && (
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setShowGenerateModal(true)}
          >
            <SparklesIcon className="w-4 h-4 mr-2" />
            Generate Clinical Notes
          </Button>
        )}
      </div>

      {/* Clinical Flags Alert */}
      {session.clinicalFlags && session.clinicalFlags.length > 0 && (
        <div className="alert alert-error mb-6">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <div>
            <h4 className="font-semibold">Clinical Flags Detected</h4>
            <ul className="mt-2 space-y-1">
              {session.clinicalFlags.map((flag, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium">{flag.type}:</span> {flag.description}
                  <Badge variant={flag.severity === 'CRITICAL' ? 'error' : 'warning'} size="sm" className="ml-2">
                    {flag.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Session Recording or Content */}
      {isActive ? (
        <SessionRecording
          sessionId={session.id}
          patientName={`${session.patient.firstName} ${session.patient.lastName}`}
          therapistName={session.therapist.name}
          onSessionComplete={handleSessionComplete}
        />
      ) : (
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
              Transcript
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
              Clinical Notes
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
              Patient Info
            </Tab>
          </Tab.List>
          
          <Tab.Panels>
            {/* Transcript Tab */}
            <Tab.Panel>
              <Card>
                <Card.Body>
                  {hasTranscript ? (
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap">{session.transcript}</div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <VideoCameraIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">No transcript available for this session</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab.Panel>
            
            {/* Clinical Notes Tab */}
            <Tab.Panel>
              {hasClinicalNotes ? (
                <div className="space-y-4">
                  {session.clinicalNotes!.map((note) => (
                    <Card key={note.id}>
                      <Card.Body>
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-semibold">{note.type.toUpperCase()} Note</h4>
                          <span className="text-sm text-gray-500">
                            {format(new Date(note.createdAt), 'PPp')}
                          </span>
                        </div>
                        <div className="prose max-w-none">
                          <pre className="whitespace-pre-wrap font-sans">
                            {JSON.stringify(note.content, null, 2)}
                          </pre>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button variant="outline" size="sm">
                            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                            Export PDF
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <Card.Body className="text-center py-12">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 mb-4">No clinical notes generated yet</p>
                    {session.status === 'COMPLETED' && (
                      <Button 
                        variant="primary"
                        onClick={() => setShowGenerateModal(true)}
                      >
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        Generate Clinical Notes
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              )}
            </Tab.Panel>
            
            {/* Patient Info Tab */}
            <Tab.Panel>
              <Card>
                <Card.Body>
                  <h4 className="font-semibold mb-4">Patient Information</h4>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm">
                        {session.patient.firstName} {session.patient.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                      <dd className="mt-1 text-sm">
                        {format(new Date(session.patient.dateOfBirth), 'PP')}
                      </dd>
                    </div>
                    {session.patient.medicalRecordNumber && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">MRN</dt>
                        <dd className="mt-1 text-sm">{session.patient.medicalRecordNumber}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Therapist</dt>
                      <dd className="mt-1 text-sm">
                        {session.therapist.name}, {session.therapist.title}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6">
                    <Link href={`/teams/${team.slug}/patients/${session.patient.id}`}>
                      <Button variant="outline" size="sm">
                        View Full Patient Record
                      </Button>
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      )}

      {/* Generate Document Modal */}
      <Modal open={showGenerateModal} onClose={() => setShowGenerateModal(false)}>
        <Modal.Header>Generate Clinical Document</Modal.Header>
        <Modal.Body>
          <p className="mb-4">Select the type of clinical document to generate from the session transcript:</p>
          <div className="space-y-2">
            <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-base-200">
              <input
                type="radio"
                name="documentType"
                value="soap"
                checked={selectedDocumentType === 'soap'}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="mt-1"
              />
              <div className="ml-3">
                <div className="font-medium">SOAP Note</div>
                <div className="text-sm text-gray-500">
                  Subjective, Objective, Assessment, and Plan format
                </div>
              </div>
            </label>
            <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-base-200">
              <input
                type="radio"
                name="documentType"
                value="progress"
                checked={selectedDocumentType === 'progress'}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="mt-1"
              />
              <div className="ml-3">
                <div className="font-medium">Progress Note</div>
                <div className="text-sm text-gray-500">
                  Detailed progress update with treatment response
                </div>
              </div>
            </label>
            <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-base-200">
              <input
                type="radio"
                name="documentType"
                value="treatment_plan"
                checked={selectedDocumentType === 'treatment_plan'}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="mt-1"
              />
              <div className="ml-3">
                <div className="font-medium">Treatment Plan Update</div>
                <div className="text-sm text-gray-500">
                  Updated goals and interventions based on session
                </div>
              </div>
            </label>
          </div>
        </Modal.Body>
        <Modal.Actions>
          <Button variant="ghost" onClick={() => setShowGenerateModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => handleGenerateDocument(selectedDocumentType)}
            loading={generatingDocument}
          >
            Generate Document
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

export default SessionPage;