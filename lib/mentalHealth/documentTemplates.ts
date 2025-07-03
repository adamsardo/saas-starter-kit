import { DocumentType, TherapyModality } from '@prisma/client';

export interface DocumentField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number' | 'checkbox' | 'section';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  dependsOn?: {
    fieldId: string;
    value: any;
  };
  aiHint?: string; // Hint for AI to fill this field
}

export interface DocumentSection {
  id: string;
  title: string;
  description?: string;
  fields: DocumentField[];
  repeatable?: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  modality?: TherapyModality;
  description: string;
  sections: DocumentSection[];
  metadata?: {
    estimatedTime?: number; // minutes
    requiredForInsurance?: boolean;
    reviewRequired?: boolean;
  };
}

// SOAP Note Template
export const soapNoteTemplate: DocumentTemplate = {
  id: 'soap-note',
  name: 'SOAP Note',
  type: 'SOAP_NOTE',
  description: 'Subjective, Objective, Assessment, Plan format for session documentation',
  sections: [
    {
      id: 'subjective',
      title: 'Subjective',
      description: 'Patient\'s reported symptoms, feelings, and concerns',
      fields: [
        {
          id: 'chief_complaint',
          label: 'Chief Complaint',
          type: 'textarea',
          required: true,
          placeholder: 'Primary reason for visit',
          aiHint: 'Extract the main concern or issue the patient discussed',
        },
        {
          id: 'mood',
          label: 'Reported Mood',
          type: 'select',
          required: true,
          options: [
            { value: 'depressed', label: 'Depressed' },
            { value: 'anxious', label: 'Anxious' },
            { value: 'stable', label: 'Stable' },
            { value: 'elevated', label: 'Elevated' },
            { value: 'irritable', label: 'Irritable' },
            { value: 'mixed', label: 'Mixed' },
          ],
          aiHint: 'Identify the patient\'s self-reported mood',
        },
        {
          id: 'symptoms',
          label: 'Reported Symptoms',
          type: 'multiselect',
          options: [
            { value: 'sleep_disturbance', label: 'Sleep Disturbance' },
            { value: 'appetite_changes', label: 'Appetite Changes' },
            { value: 'concentration_issues', label: 'Concentration Issues' },
            { value: 'fatigue', label: 'Fatigue' },
            { value: 'hopelessness', label: 'Hopelessness' },
            { value: 'anxiety', label: 'Anxiety' },
            { value: 'panic_attacks', label: 'Panic Attacks' },
            { value: 'suicidal_ideation', label: 'Suicidal Ideation' },
          ],
          aiHint: 'Identify all symptoms mentioned by the patient',
        },
        {
          id: 'subjective_notes',
          label: 'Additional Subjective Information',
          type: 'textarea',
          placeholder: 'Other relevant information reported by patient',
          aiHint: 'Include any other subjective information from the patient',
        },
      ],
    },
    {
      id: 'objective',
      title: 'Objective',
      description: 'Observable behaviors and clinical observations',
      fields: [
        {
          id: 'appearance',
          label: 'Appearance',
          type: 'select',
          required: true,
          options: [
            { value: 'well_groomed', label: 'Well-groomed' },
            { value: 'casual', label: 'Casual' },
            { value: 'disheveled', label: 'Disheveled' },
            { value: 'inappropriate', label: 'Inappropriate' },
          ],
        },
        {
          id: 'behavior',
          label: 'Behavior',
          type: 'multiselect',
          options: [
            { value: 'cooperative', label: 'Cooperative' },
            { value: 'engaged', label: 'Engaged' },
            { value: 'withdrawn', label: 'Withdrawn' },
            { value: 'agitated', label: 'Agitated' },
            { value: 'restless', label: 'Restless' },
            { value: 'tearful', label: 'Tearful' },
          ],
        },
        {
          id: 'speech',
          label: 'Speech',
          type: 'select',
          options: [
            { value: 'normal', label: 'Normal rate and volume' },
            { value: 'rapid', label: 'Rapid' },
            { value: 'slow', label: 'Slow' },
            { value: 'soft', label: 'Soft' },
            { value: 'loud', label: 'Loud' },
            { value: 'pressured', label: 'Pressured' },
          ],
        },
        {
          id: 'affect',
          label: 'Affect',
          type: 'select',
          required: true,
          options: [
            { value: 'appropriate', label: 'Appropriate' },
            { value: 'flat', label: 'Flat' },
            { value: 'blunted', label: 'Blunted' },
            { value: 'labile', label: 'Labile' },
            { value: 'restricted', label: 'Restricted' },
          ],
        },
        {
          id: 'thought_process',
          label: 'Thought Process',
          type: 'select',
          options: [
            { value: 'linear', label: 'Linear and organized' },
            { value: 'circumstantial', label: 'Circumstantial' },
            { value: 'tangential', label: 'Tangential' },
            { value: 'disorganized', label: 'Disorganized' },
            { value: 'racing', label: 'Racing thoughts' },
          ],
        },
        {
          id: 'objective_notes',
          label: 'Additional Objective Observations',
          type: 'textarea',
          placeholder: 'Other clinical observations',
        },
      ],
    },
    {
      id: 'assessment',
      title: 'Assessment',
      description: 'Clinical assessment and interpretation',
      fields: [
        {
          id: 'progress',
          label: 'Progress Since Last Session',
          type: 'select',
          required: true,
          options: [
            { value: 'significant_improvement', label: 'Significant Improvement' },
            { value: 'moderate_improvement', label: 'Moderate Improvement' },
            { value: 'minimal_improvement', label: 'Minimal Improvement' },
            { value: 'no_change', label: 'No Change' },
            { value: 'regression', label: 'Regression' },
          ],
        },
        {
          id: 'risk_assessment',
          label: 'Risk Assessment',
          type: 'section',
          fields: [
            {
              id: 'suicide_risk',
              label: 'Suicide Risk',
              type: 'select',
              required: true,
              options: [
                { value: 'none', label: 'None' },
                { value: 'low', label: 'Low' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'high', label: 'High' },
                { value: 'imminent', label: 'Imminent' },
              ],
            },
            {
              id: 'homicide_risk',
              label: 'Homicide Risk',
              type: 'select',
              required: true,
              options: [
                { value: 'none', label: 'None' },
                { value: 'low', label: 'Low' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'high', label: 'High' },
              ],
            },
            {
              id: 'self_harm_risk',
              label: 'Self-Harm Risk',
              type: 'select',
              options: [
                { value: 'none', label: 'None' },
                { value: 'low', label: 'Low' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'high', label: 'High' },
              ],
            },
          ],
        },
        {
          id: 'diagnosis_review',
          label: 'Diagnosis Review',
          type: 'textarea',
          placeholder: 'Current diagnostic impressions and any changes',
          aiHint: 'Review current diagnoses based on session content',
        },
        {
          id: 'clinical_impressions',
          label: 'Clinical Impressions',
          type: 'textarea',
          required: true,
          placeholder: 'Summary of clinical observations and interpretations',
          aiHint: 'Provide clinical interpretation of the session',
        },
      ],
    },
    {
      id: 'plan',
      title: 'Plan',
      description: 'Treatment plan and next steps',
      fields: [
        {
          id: 'interventions_used',
          label: 'Interventions Used This Session',
          type: 'multiselect',
          options: [
            { value: 'cbt', label: 'Cognitive Behavioral Therapy' },
            { value: 'dbt', label: 'Dialectical Behavior Therapy' },
            { value: 'mindfulness', label: 'Mindfulness Techniques' },
            { value: 'psychoeducation', label: 'Psychoeducation' },
            { value: 'exposure', label: 'Exposure Therapy' },
            { value: 'behavioral_activation', label: 'Behavioral Activation' },
            { value: 'problem_solving', label: 'Problem-Solving Therapy' },
            { value: 'supportive', label: 'Supportive Therapy' },
          ],
          aiHint: 'Identify therapeutic interventions used',
        },
        {
          id: 'homework',
          label: 'Homework Assigned',
          type: 'textarea',
          placeholder: 'Specific assignments or practices for patient',
          aiHint: 'Extract any homework or between-session tasks assigned',
        },
        {
          id: 'next_session_focus',
          label: 'Next Session Focus',
          type: 'textarea',
          placeholder: 'Topics or goals for next session',
        },
        {
          id: 'frequency',
          label: 'Session Frequency',
          type: 'select',
          options: [
            { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Bi-weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'as_needed', label: 'As Needed' },
          ],
        },
        {
          id: 'referrals',
          label: 'Referrals Made',
          type: 'textarea',
          placeholder: 'Any referrals to other providers or services',
        },
        {
          id: 'medication_discussion',
          label: 'Medication Discussion',
          type: 'textarea',
          placeholder: 'Any discussion about medications',
          aiHint: 'Note any medication-related discussions',
        },
      ],
    },
  ],
  metadata: {
    estimatedTime: 15,
    requiredForInsurance: true,
    reviewRequired: false,
  },
};

// Treatment Plan Template
export const treatmentPlanTemplate: DocumentTemplate = {
  id: 'treatment-plan',
  name: 'Treatment Plan',
  type: 'TREATMENT_PLAN',
  description: 'Comprehensive treatment plan with goals and objectives',
  sections: [
    {
      id: 'overview',
      title: 'Treatment Overview',
      fields: [
        {
          id: 'primary_diagnosis',
          label: 'Primary Diagnosis',
          type: 'text',
          required: true,
          placeholder: 'ICD-10 code and description',
        },
        {
          id: 'secondary_diagnoses',
          label: 'Secondary Diagnoses',
          type: 'textarea',
          placeholder: 'Additional diagnoses',
        },
        {
          id: 'treatment_modality',
          label: 'Primary Treatment Modality',
          type: 'select',
          required: true,
          options: [
            { value: 'CBT', label: 'Cognitive Behavioral Therapy' },
            { value: 'DBT', label: 'Dialectical Behavior Therapy' },
            { value: 'EMDR', label: 'EMDR' },
            { value: 'PSYCHODYNAMIC', label: 'Psychodynamic Therapy' },
            { value: 'MINDFULNESS', label: 'Mindfulness-Based Therapy' },
            { value: 'FAMILY', label: 'Family Therapy' },
            { value: 'GROUP', label: 'Group Therapy' },
          ],
        },
        {
          id: 'estimated_duration',
          label: 'Estimated Treatment Duration',
          type: 'select',
          options: [
            { value: '3_months', label: '3 Months' },
            { value: '6_months', label: '6 Months' },
            { value: '12_months', label: '12 Months' },
            { value: 'ongoing', label: 'Ongoing' },
          ],
        },
      ],
    },
    {
      id: 'goals',
      title: 'Treatment Goals',
      description: 'Long-term goals for treatment',
      repeatable: true,
      fields: [
        {
          id: 'goal_description',
          label: 'Goal Description',
          type: 'textarea',
          required: true,
          placeholder: 'Describe the treatment goal',
        },
        {
          id: 'target_date',
          label: 'Target Date',
          type: 'date',
          required: true,
        },
        {
          id: 'measurement',
          label: 'How will this be measured?',
          type: 'textarea',
          required: true,
          placeholder: 'Specific criteria for measuring progress',
        },
      ],
    },
    {
      id: 'objectives',
      title: 'Treatment Objectives',
      description: 'Specific, measurable objectives',
      repeatable: true,
      fields: [
        {
          id: 'objective_description',
          label: 'Objective',
          type: 'textarea',
          required: true,
          placeholder: 'SMART objective',
        },
        {
          id: 'related_goal',
          label: 'Related Goal',
          type: 'text',
          placeholder: 'Which goal does this support?',
        },
        {
          id: 'interventions',
          label: 'Interventions',
          type: 'textarea',
          required: true,
          placeholder: 'Specific interventions to achieve this objective',
        },
        {
          id: 'timeline',
          label: 'Timeline',
          type: 'select',
          options: [
            { value: '1_week', label: '1 Week' },
            { value: '2_weeks', label: '2 Weeks' },
            { value: '1_month', label: '1 Month' },
            { value: '3_months', label: '3 Months' },
          ],
        },
      ],
    },
    {
      id: 'crisis_plan',
      title: 'Crisis Plan',
      fields: [
        {
          id: 'warning_signs',
          label: 'Warning Signs',
          type: 'textarea',
          placeholder: 'Early warning signs of crisis',
        },
        {
          id: 'coping_strategies',
          label: 'Coping Strategies',
          type: 'textarea',
          placeholder: 'Patient\'s coping strategies',
        },
        {
          id: 'support_contacts',
          label: 'Support Contacts',
          type: 'textarea',
          placeholder: 'Emergency contacts and support system',
        },
        {
          id: 'crisis_resources',
          label: 'Crisis Resources',
          type: 'textarea',
          defaultValue: 'National Suicide Prevention Lifeline: 988\nCrisis Text Line: Text HOME to 741741',
        },
      ],
    },
  ],
  metadata: {
    estimatedTime: 30,
    requiredForInsurance: true,
    reviewRequired: true,
  },
};

// Progress Report Template
export const progressReportTemplate: DocumentTemplate = {
  id: 'progress-report',
  name: 'Progress Report',
  type: 'PROGRESS_REPORT',
  description: 'Periodic progress report for treatment review',
  sections: [
    {
      id: 'report_period',
      title: 'Reporting Period',
      fields: [
        {
          id: 'start_date',
          label: 'Period Start Date',
          type: 'date',
          required: true,
        },
        {
          id: 'end_date',
          label: 'Period End Date',
          type: 'date',
          required: true,
        },
        {
          id: 'sessions_completed',
          label: 'Number of Sessions Completed',
          type: 'number',
          required: true,
          validation: {
            min: 0,
            max: 100,
          },
        },
        {
          id: 'sessions_cancelled',
          label: 'Number of Sessions Cancelled/No-Show',
          type: 'number',
          validation: {
            min: 0,
            max: 100,
          },
        },
      ],
    },
    {
      id: 'progress_summary',
      title: 'Progress Summary',
      fields: [
        {
          id: 'overall_progress',
          label: 'Overall Progress',
          type: 'select',
          required: true,
          options: [
            { value: 'excellent', label: 'Excellent Progress' },
            { value: 'good', label: 'Good Progress' },
            { value: 'moderate', label: 'Moderate Progress' },
            { value: 'minimal', label: 'Minimal Progress' },
            { value: 'no_progress', label: 'No Progress' },
            { value: 'regression', label: 'Regression' },
          ],
        },
        {
          id: 'progress_narrative',
          label: 'Progress Narrative',
          type: 'textarea',
          required: true,
          placeholder: 'Detailed description of patient progress',
        },
        {
          id: 'goals_achieved',
          label: 'Goals Achieved',
          type: 'textarea',
          placeholder: 'List goals that have been met',
        },
        {
          id: 'ongoing_challenges',
          label: 'Ongoing Challenges',
          type: 'textarea',
          placeholder: 'Current challenges and barriers to progress',
        },
      ],
    },
    {
      id: 'treatment_modifications',
      title: 'Treatment Modifications',
      fields: [
        {
          id: 'modifications_made',
          label: 'Modifications Made',
          type: 'textarea',
          placeholder: 'Changes to treatment approach during this period',
        },
        {
          id: 'medication_changes',
          label: 'Medication Changes',
          type: 'textarea',
          placeholder: 'Any medication adjustments (if applicable)',
        },
        {
          id: 'recommendations',
          label: 'Recommendations',
          type: 'textarea',
          required: true,
          placeholder: 'Recommendations for continued treatment',
        },
      ],
    },
  ],
  metadata: {
    estimatedTime: 20,
    requiredForInsurance: true,
    reviewRequired: true,
  },
};

// Get all templates
export const getAllTemplates = (): DocumentTemplate[] => [
  soapNoteTemplate,
  treatmentPlanTemplate,
  progressReportTemplate,
];

// Get template by type
export const getTemplateByType = (type: DocumentType): DocumentTemplate | undefined => {
  return getAllTemplates().find(t => t.type === type);
};

// Get templates by modality
export const getTemplatesByModality = (modality: TherapyModality): DocumentTemplate[] => {
  return getAllTemplates().filter(t => !t.modality || t.modality === modality);
}; 