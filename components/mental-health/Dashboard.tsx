'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import classNames from 'classnames';
import Link from 'next/link';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  lastSession?: Date;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  nextAppointment?: Date;
  primaryDiagnosis?: string;
  isActive: boolean;
}

interface TherapySession {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sessionType: string;
  duration?: number;
  hasRecording: boolean;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

interface DashboardStats {
  totalPatients: number;
  todaySessions: number;
  completedSessions: number;
  highRiskPatients: number;
  documentsPending: number;
}

export default function MentalHealthDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [todaySessions, setTodaySessions] = useState<TherapySession[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todaySessions: 0,
    completedSessions: 0,
    highRiskPatients: 0,
    documentsPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'patients' | 'documents'>('today');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // This would be replaced with actual API calls
      // const [patientsRes, sessionsRes, statsRes] = await Promise.all([
      //   fetch('/api/mental-health/patients'),
      //   fetch('/api/mental-health/sessions/today'),
      //   fetch('/api/mental-health/stats')
      // ]);

      // Mock data for demonstration
      const mockPatients: Patient[] = [
        {
          id: '1',
          firstName: 'Sarah',
          lastName: 'Johnson',
          lastSession: new Date('2024-01-15'),
          riskLevel: 'MODERATE',
          nextAppointment: new Date('2024-01-22'),
          primaryDiagnosis: 'Depression',
          isActive: true,
        },
        {
          id: '2',
          firstName: 'Michael',
          lastName: 'Chen',
          lastSession: new Date('2024-01-14'),
          riskLevel: 'HIGH',
          nextAppointment: new Date('2024-01-21'),
          primaryDiagnosis: 'PTSD',
          isActive: true,
        },
        {
          id: '3',
          firstName: 'Emily',
          lastName: 'Davis',
          lastSession: new Date('2024-01-13'),
          riskLevel: 'LOW',
          nextAppointment: new Date('2024-01-27'),
          primaryDiagnosis: 'Anxiety',
          isActive: true,
        },
      ];

      const mockSessions: TherapySession[] = [
        {
          id: '1',
          patientId: '1',
          patientName: 'Sarah Johnson',
          scheduledAt: new Date('2024-01-20T09:00:00'),
          status: 'SCHEDULED',
          sessionType: 'INDIVIDUAL',
          hasRecording: false,
          riskLevel: 'MODERATE',
        },
        {
          id: '2',
          patientId: '2',
          patientName: 'Michael Chen',
          scheduledAt: new Date('2024-01-20T11:00:00'),
          status: 'COMPLETED',
          sessionType: 'INDIVIDUAL',
          duration: 50,
          hasRecording: true,
          riskLevel: 'HIGH',
        },
        {
          id: '3',
          patientId: '3',
          patientName: 'Emily Davis',
          scheduledAt: new Date('2024-01-20T14:00:00'),
          status: 'SCHEDULED',
          sessionType: 'INDIVIDUAL',
          hasRecording: false,
          riskLevel: 'LOW',
        },
      ];

      const mockStats: DashboardStats = {
        totalPatients: 15,
        todaySessions: 4,
        completedSessions: 2,
        highRiskPatients: 3,
        documentsPending: 7,
      };

      setPatients(mockPatients);
      setTodaySessions(mockSessions);
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-700 bg-red-100';
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MODERATE': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-700 bg-green-100';
      case 'IN_PROGRESS': return 'text-blue-700 bg-blue-100';
      case 'SCHEDULED': return 'text-gray-700 bg-gray-100';
      case 'CANCELLED': return 'text-red-700 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinical Dashboard</h1>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link
            href="/mental-health/patients/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + New Patient
          </Link>
          <Link
            href="/mental-health/sessions/new"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Schedule Session
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalPatients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">📅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.todaySessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completedSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.highRiskPatients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-lg">📄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Docs</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.documentsPending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('today')}
              className={classNames(
                'py-4 px-6 border-b-2 font-medium text-sm',
                activeTab === 'today'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Today's Sessions
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={classNames(
                'py-4 px-6 border-b-2 font-medium text-sm',
                activeTab === 'patients'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Patients
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={classNames(
                'py-4 px-6 border-b-2 font-medium text-sm',
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Documents
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Today's Sessions Tab */}
          {activeTab === 'today' && (
            <div className="space-y-4">
              {todaySessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No sessions scheduled for today</p>
                </div>
              ) : (
                todaySessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {session.patientName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{session.patientName}</h3>
                        <p className="text-sm text-gray-600">
                          {formatTime(session.scheduledAt)} • {session.sessionType}
                          {session.duration && ` • ${session.duration} min`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={classNames(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        getRiskLevelColor(session.riskLevel)
                      )}>
                        {session.riskLevel}
                      </span>
                      
                      <span className={classNames(
                        'px-3 py-1 text-sm font-medium rounded-full',
                        getStatusColor(session.status)
                      )}>
                        {session.status.replace('_', ' ')}
                      </span>

                      {session.hasRecording && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Has recording" />
                      )}

                      <div className="flex space-x-2">
                        {session.status === 'SCHEDULED' && (
                          <Link
                            href={`/mental-health/sessions/${session.id}/record`}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            Start Session
                          </Link>
                        )}
                        
                        <Link
                          href={`/mental-health/sessions/${session.id}`}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium">
                          {patient.firstName[0]}{patient.lastName[0]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {patient.primaryDiagnosis && (
                          <span>{patient.primaryDiagnosis}</span>
                        )}
                        {patient.lastSession && (
                          <span>Last session: {patient.lastSession.toLocaleDateString()}</span>
                        )}
                        {patient.nextAppointment && (
                          <span>Next: {patient.nextAppointment.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={classNames(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getRiskLevelColor(patient.riskLevel)
                    )}>
                      {patient.riskLevel}
                    </span>

                    <Link
                      href={`/mental-health/patients/${patient.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="text-center py-8">
              <p className="text-gray-500">Document management feature coming soon</p>
              <p className="text-sm text-gray-400 mt-2">
                This will show pending clinical documents that need review and approval
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}