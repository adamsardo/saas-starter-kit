import { Error, Loading } from '@/components/shared';
import { TeamTab } from '@/components/team';
import { Button } from '@/components/shared';
import { Card } from '@/components/shared';
import env from '@/lib/env';
import useTeam from 'hooks/useTeam';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetcher } from '@/lib/common';
import Link from 'next/link';
import { 
  VideoCameraIcon, 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface TherapySession {
  id: string;
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sessionType: string;
  duration?: number;
  hasTranscript: boolean;
  hasClinicalNotes: boolean;
  clinicalFlags?: Array<{
    type: string;
    severity: string;
  }>;
}

const SessionStatus = ({ status }: { status: TherapySession['status'] }) => {
  const statusConfig = {
    SCHEDULED: { color: 'badge-info', icon: CalendarIcon, text: 'Scheduled' },
    IN_PROGRESS: { color: 'badge-warning', icon: PlayIcon, text: 'In Progress' },
    COMPLETED: { color: 'badge-success', icon: CheckCircleIcon, text: 'Completed' },
    CANCELLED: { color: 'badge-error', icon: ExclamationTriangleIcon, text: 'Cancelled' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`badge ${config.color} gap-2`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </div>
  );
};

const TeamSessions = ({ teamFeatures }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();
  const router = useRouter();
  
  const { data: sessions, error: sessionsError } = useSWR<TherapySession[]>(
    team?.slug ? `/api/teams/${team.slug}/sessions` : null,
    fetcher
  );

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

  const upcomingSessions = sessions?.filter(s => s.status === 'SCHEDULED') || [];
  const inProgressSessions = sessions?.filter(s => s.status === 'IN_PROGRESS') || [];
  const recentSessions = sessions?.filter(s => 
    s.status === 'COMPLETED' && 
    new Date(s.endedAt!).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  ) || [];

  return (
    <>
      <TeamTab activeTab="sessions" team={team} teamFeatures={teamFeatures} />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Therapy Sessions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage and review therapy sessions for your patients
            </p>
          </div>
          <Link href={`/teams/${team.slug}/sessions/new`}>
            <Button variant="primary" size="md">
              <VideoCameraIcon className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </Link>
        </div>

        {/* In Progress Sessions */}
        {inProgressSessions.length > 0 && (
          <div>
            <h4 className="text-md font-medium mb-3 text-warning">Sessions in Progress</h4>
            <div className="grid gap-4">
              {inProgressSessions.map((session) => (
                <Card key={session.id} className="border-warning">
                  <Card.Body className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                          <span className="font-medium">
                            {session.patient.firstName} {session.patient.lastName}
                          </span>
                          <SessionStatus status={session.status} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            Started {formatDistanceToNow(new Date(session.startedAt!))} ago
                          </span>
                          <span>{session.sessionType}</span>
                        </div>
                      </div>
                      <Link href={`/teams/${team.slug}/sessions/${session.id}`}>
                        <Button variant="primary" size="sm">
                          <PlayIcon className="w-4 h-4 mr-1" />
                          Continue
                        </Button>
                      </Link>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Sessions */}
        <div>
          <h4 className="text-md font-medium mb-3">Upcoming Sessions</h4>
          {upcomingSessions.length === 0 ? (
            <Card>
              <Card.Body className="text-center py-8">
                <CalendarIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No upcoming sessions scheduled</p>
              </Card.Body>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingSessions.map((session) => (
                <Card key={session.id}>
                  <Card.Body className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                          <span className="font-medium">
                            {session.patient.firstName} {session.patient.lastName}
                          </span>
                          <SessionStatus status={session.status} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {new Date(session.scheduledAt).toLocaleString()}
                          </span>
                          <span>{session.sessionType}</span>
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
          )}
        </div>

        {/* Recent Sessions */}
        <div>
          <h4 className="text-md font-medium mb-3">Recent Sessions</h4>
          {recentSessions.length === 0 ? (
            <Card>
              <Card.Body className="text-center py-8">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No recent sessions</p>
              </Card.Body>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recentSessions.map((session) => (
                <Card key={session.id}>
                  <Card.Body className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                          <span className="font-medium">
                            {session.patient.firstName} {session.patient.lastName}
                          </span>
                          <SessionStatus status={session.status} />
                          {session.clinicalFlags && session.clinicalFlags.length > 0 && (
                            <div className="badge badge-error gap-1">
                              <ExclamationTriangleIcon className="w-3 h-3" />
                              {session.clinicalFlags.length} Flags
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {formatDistanceToNow(new Date(session.endedAt!))} ago
                          </span>
                          <span>{session.duration ? `${session.duration} minutes` : session.sessionType}</span>
                          {session.hasTranscript && (
                            <span className="flex items-center gap-1 text-success">
                              <CheckCircleIcon className="w-4 h-4" />
                              Transcript
                            </span>
                          )}
                          {session.hasClinicalNotes && (
                            <span className="flex items-center gap-1 text-success">
                              <DocumentTextIcon className="w-4 h-4" />
                              Notes
                            </span>
                          )}
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
          )}
        </div>
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

export default TeamSessions;