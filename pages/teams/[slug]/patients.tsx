import { Error, Loading } from '@/components/shared';
import { TeamTab } from '@/components/team';
import { Button, Card, Badge } from '@/components/shared';
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
  UserPlusIcon,
  UserIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronUpDownIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow, format } from 'date-fns';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  medicalRecordNumber?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCHARGED';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  lastSessionDate?: string;
  upcomingSessionDate?: string;
  totalSessions: number;
  assignedTherapist?: {
    id: string;
    name: string;
  };
  diagnoses?: string[];
  tags?: string[];
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

const StatusBadge = ({ status }: { status: Patient['status'] }) => {
  const config = {
    ACTIVE: { color: 'badge-success', text: 'Active' },
    INACTIVE: { color: 'badge-warning', text: 'Inactive' },
    DISCHARGED: { color: 'badge-ghost', text: 'Discharged' },
  };

  const badgeConfig = config[status];
  return <Badge className={badgeConfig.color}>{badgeConfig.text}</Badge>;
};

const TeamPatients = ({ teamFeatures }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('name');
  
  const { data: patients, error: patientsError } = useSWR<Patient[]>(
    team?.slug ? `/api/teams/${team.slug}/patients` : null,
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

  // Filter and sort patients
  const filteredPatients = patients?.filter(patient => {
    const matchesSearch = searchTerm === '' || 
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.medicalRecordNumber?.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      case 'lastSession':
        if (!a.lastSessionDate) return 1;
        if (!b.lastSessionDate) return -1;
        return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime();
      case 'risk':
        const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, undefined: 3 };
        return (riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 3) - 
               (riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 3);
      default:
        return 0;
    }
  }) || [];

  const activePatients = patients?.filter(p => p.status === 'ACTIVE').length || 0;
  const highRiskPatients = patients?.filter(p => p.riskLevel === 'HIGH').length || 0;

  return (
    <>
      <TeamTab activeTab="patients" team={team} teamFeatures={teamFeatures} />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Patient Management</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage patient records and treatment information
            </p>
          </div>
          <Link href={`/teams/${team.slug}/patients/new`}>
            <Button variant="primary" size="md">
              <UserPlusIcon className="w-4 h-4 mr-2" />
              New Patient
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <Card.Body className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Patients</p>
                  <p className="text-2xl font-semibold">{patients?.length || 0}</p>
                </div>
                <UserIcon className="w-8 h-8 text-primary opacity-20" />
              </div>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Body className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Patients</p>
                  <p className="text-2xl font-semibold">{activePatients}</p>
                </div>
                <UserIcon className="w-8 h-8 text-success opacity-20" />
              </div>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Body className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">High Risk</p>
                  <p className="text-2xl font-semibold">{highRiskPatients}</p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-error opacity-20" />
              </div>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Body className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Sessions Today</p>
                  <p className="text-2xl font-semibold">
                    {patients?.filter(p => {
                      if (!p.upcomingSessionDate) return false;
                      const sessionDate = new Date(p.upcomingSessionDate);
                      const today = new Date();
                      return sessionDate.toDateString() === today.toDateString();
                    }).length || 0}
                  </p>
                </div>
                <CalendarIcon className="w-8 h-8 text-info opacity-20" />
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or MRN..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select 
              className="select select-bordered"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DISCHARGED">Discharged</option>
            </select>
            
            <select 
              className="select select-bordered"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Sort by Name</option>
              <option value="lastSession">Last Session</option>
              <option value="risk">Risk Level</option>
            </select>
          </div>
        </div>

        {/* Patients List */}
        {filteredPatients.length === 0 ? (
          <Card>
            <Card.Body className="text-center py-12">
              <UserIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No patients found matching your criteria' 
                  : 'No patients registered yet'}
              </p>
            </Card.Body>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="hover:shadow-lg transition-shadow">
                <Card.Body className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/teams/${team.slug}/patients/${patient.id}`}>
                          <h4 className="font-semibold text-lg hover:text-primary cursor-pointer">
                            {patient.firstName} {patient.lastName}
                          </h4>
                        </Link>
                        <StatusBadge status={patient.status} />
                        <RiskBadge level={patient.riskLevel} />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>DOB: {format(new Date(patient.dateOfBirth), 'PP')}</span>
                        </div>
                        
                        {patient.phone && (
                          <div className="flex items-center gap-1">
                            <PhoneIcon className="w-4 h-4" />
                            <span>{patient.phone}</span>
                          </div>
                        )}
                        
                        {patient.email && (
                          <div className="flex items-center gap-1">
                            <EnvelopeIcon className="w-4 h-4" />
                            <span className="truncate">{patient.email}</span>
                          </div>
                        )}
                        
                        {patient.medicalRecordNumber && (
                          <div className="flex items-center gap-1">
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>MRN: {patient.medicalRecordNumber}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        {patient.assignedTherapist && (
                          <span className="text-gray-600">
                            Therapist: <span className="font-medium">{patient.assignedTherapist.name}</span>
                          </span>
                        )}
                        
                        <span className="text-gray-600">
                          Sessions: <span className="font-medium">{patient.totalSessions}</span>
                        </span>
                        
                        {patient.lastSessionDate && (
                          <span className="text-gray-600">
                            Last session: <span className="font-medium">
                              {formatDistanceToNow(new Date(patient.lastSessionDate), { addSuffix: true })}
                            </span>
                          </span>
                        )}
                      </div>
                      
                      {patient.diagnoses && patient.diagnoses.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {patient.diagnoses.map((diagnosis, index) => (
                            <Badge key={index} variant="ghost" size="sm">
                              {diagnosis}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {patient.upcomingSessionDate && (
                        <Link href={`/teams/${team.slug}/sessions/new?patientId=${patient.id}`}>
                          <Button variant="outline" size="sm">
                            <CalendarIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                      <Link href={`/teams/${team.slug}/patients/${patient.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
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

export default TeamPatients;