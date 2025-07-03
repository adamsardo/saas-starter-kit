import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { getModel } from '@/lib/ai/config';
import { DocumentTemplate, DocumentField } from './documentTemplates';
import { extractMedicalEntities } from '@/lib/deepgram/client';

// Schema for SOAP note generation
const soapNoteSchema = z.object({
  subjective: z.object({
    chief_complaint: z.string().describe('Primary reason for visit based on patient report'),
    mood: z.enum(['depressed', 'anxious', 'stable', 'elevated', 'irritable', 'mixed']),
    symptoms: z.array(z.string()).describe('List of reported symptoms'),
    subjective_notes: z.string().describe('Additional subjective information'),
  }),
  objective: z.object({
    appearance: z.enum(['well_groomed', 'casual', 'disheveled', 'inappropriate']),
    behavior: z.array(z.string()).describe('Observable behaviors'),
    speech: z.enum(['normal', 'rapid', 'slow', 'soft', 'loud', 'pressured']),
    affect: z.enum(['appropriate', 'flat', 'blunted', 'labile', 'restricted']),
    thought_process: z.enum(['linear', 'circumstantial', 'tangential', 'disorganized', 'racing']),
    objective_notes: z.string().describe('Additional clinical observations'),
  }),
  assessment: z.object({
    progress: z.enum(['significant_improvement', 'moderate_improvement', 'minimal_improvement', 'no_change', 'regression']),
    risk_assessment: z.object({
      suicide_risk: z.enum(['none', 'low', 'moderate', 'high', 'imminent']),
      homicide_risk: z.enum(['none', 'low', 'moderate', 'high']),
      self_harm_risk: z.enum(['none', 'low', 'moderate', 'high']),
    }),
    diagnosis_review: z.string().describe('Current diagnostic impressions'),
    clinical_impressions: z.string().describe('Clinical interpretation of the session'),
  }),
  plan: z.object({
    interventions_used: z.array(z.string()).describe('Therapeutic interventions used'),
    homework: z.string().describe('Assignments for patient').optional(),
    next_session_focus: z.string().describe('Topics for next session'),
    referrals: z.string().describe('Any referrals made').optional(),
    medication_discussion: z.string().describe('Medication-related discussions').optional(),
  }),
});

// Generate clinical document from transcript
export async function generateClinicalDocument(
  transcript: string,
  template: DocumentTemplate,
  sessionContext: {
    patientName: string;
    therapistName: string;
    sessionDate: Date;
    previousNotes?: string;
    diagnoses?: string[];
    medications?: string[];
  },
  modelId?: string
) {
  const model = getModel(modelId);

  // Extract medical entities from transcript
  const entities = extractMedicalEntities(transcript);

  // Build context prompt
  const contextPrompt = `
You are a licensed mental health professional creating clinical documentation.

Session Context:
- Patient: ${sessionContext.patientName}
- Therapist: ${sessionContext.therapistName}
- Date: ${sessionContext.sessionDate.toLocaleDateString()}
${sessionContext.diagnoses ? `- Current Diagnoses: ${sessionContext.diagnoses.join(', ')}` : ''}
${sessionContext.medications ? `- Current Medications: ${sessionContext.medications.join(', ')}` : ''}

${sessionContext.previousNotes ? `Previous Session Notes:\n${sessionContext.previousNotes}\n` : ''}

Session Transcript:
${transcript}

Extracted Medical Information:
- Medications mentioned: ${entities.medications.join(', ') || 'None'}
- Symptoms discussed: ${entities.symptoms.join(', ') || 'None'}
- Diagnoses mentioned: ${entities.diagnoses.join(', ') || 'None'}

Instructions:
1. Create a ${template.name} based on the session transcript
2. Use professional clinical language
3. Be objective and factual
4. Include all relevant information from the session
5. Follow standard clinical documentation practices
6. Protect patient privacy - use initials if needed
7. Flag any safety concerns appropriately
`;

  try {
    if (template.type === 'SOAP_NOTE') {
      // Generate structured SOAP note
      const { object } = await generateObject({
        model,
        schema: soapNoteSchema,
        prompt: contextPrompt,
      });

      return {
        success: true,
        documentType: template.type,
        content: object,
        metadata: {
          generatedAt: new Date(),
          modelUsed: modelId || 'default',
          extractedEntities: entities,
        },
      };
    } else {
      // For other document types, generate text sections
      const sections: Record<string, any> = {};

      for (const section of template.sections) {
        const sectionPrompt = `
${contextPrompt}

Generate the "${section.title}" section of the ${template.name}.
${section.description ? `Section description: ${section.description}` : ''}

Fields to complete:
${section.fields.map(field => `- ${field.label}: ${field.aiHint || field.placeholder || ''}`).join('\n')}

Provide the content in a structured format.
`;

        const { text } = await generateText({
          model,
          prompt: sectionPrompt,
          maxTokens: 1000,
        });

        // Parse the generated text into fields
        const fieldValues: Record<string, any> = {};
        
        // Simple parsing - in production, use more sophisticated parsing
        const lines = text.split('\n');
        let currentField = '';
        let currentValue = '';

        for (const line of lines) {
          const fieldMatch = section.fields.find(f => 
            line.toLowerCase().includes(f.label.toLowerCase())
          );
          
          if (fieldMatch) {
            if (currentField) {
              fieldValues[currentField] = currentValue.trim();
            }
            currentField = fieldMatch.id;
            currentValue = line.replace(new RegExp(fieldMatch.label + ':?', 'i'), '').trim();
          } else if (currentField) {
            currentValue += '\n' + line;
          }
        }
        
        if (currentField) {
          fieldValues[currentField] = currentValue.trim();
        }

        sections[section.id] = fieldValues;
      }

      return {
        success: true,
        documentType: template.type,
        content: sections,
        metadata: {
          generatedAt: new Date(),
          modelUsed: modelId || 'default',
          extractedEntities: entities,
        },
      };
    }
  } catch (error) {
    console.error('Error generating clinical document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate document',
    };
  }
}

// Generate summary from session transcript
export async function generateSessionSummary(
  transcript: string,
  options?: {
    maxLength?: number;
    includeActionItems?: boolean;
    includeClinicalFlags?: boolean;
  }
) {
  const model = getModel();

  const prompt = `
Summarize this therapy session transcript in a concise, professional manner.

${options?.includeActionItems ? 'Include a section for action items and homework.' : ''}
${options?.includeClinicalFlags ? 'Flag any clinical concerns or risk factors.' : ''}

Maximum length: ${options?.maxLength || 500} words.

Transcript:
${transcript}
`;

  try {
    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 1000,
    });

    return {
      summary: text,
      wordCount: text.split(/\s+/).length,
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

// Extract key topics and themes from session
export async function extractSessionThemes(transcript: string) {
  const model = getModel();

  const schema = z.object({
    primaryThemes: z.array(z.string()).describe('Main themes discussed in the session'),
    emotionalTones: z.array(z.string()).describe('Predominant emotional tones'),
    therapeuticInterventions: z.array(z.string()).describe('Therapeutic techniques used'),
    copingStrategies: z.array(z.string()).describe('Coping strategies discussed'),
    homework: z.array(z.string()).describe('Homework or tasks assigned').optional(),
    concerns: z.array(z.string()).describe('Clinical concerns or risk factors').optional(),
  });

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt: `
Analyze this therapy session transcript and extract key themes, interventions, and clinical information.

Transcript:
${transcript}
`,
    });

    return object;
  } catch (error) {
    console.error('Error extracting themes:', error);
    throw error;
  }
}

// Generate treatment recommendations based on session
export async function generateTreatmentRecommendations(
  transcript: string,
  currentDiagnoses: string[],
  treatmentHistory?: string
) {
  const model = getModel();

  const schema = z.object({
    continueCurrentApproach: z.boolean(),
    suggestedModifications: z.array(z.string()).describe('Suggested treatment modifications'),
    additionalInterventions: z.array(z.string()).describe('Additional interventions to consider'),
    referralConsiderations: z.array(z.string()).describe('Potential referrals').optional(),
    medicationConsiderations: z.string().describe('Medication-related recommendations').optional(),
    frequencyRecommendation: z.enum(['increase', 'maintain', 'decrease']),
    rationale: z.string().describe('Clinical rationale for recommendations'),
  });

  const prompt = `
Based on this therapy session, provide treatment recommendations.

Current Diagnoses: ${currentDiagnoses.join(', ')}
${treatmentHistory ? `Treatment History: ${treatmentHistory}` : ''}

Session Transcript:
${transcript}

Provide evidence-based recommendations appropriate for the patient's presentation.
`;

  try {
    const { object } = await generateObject({
      model,
      schema,
      prompt,
    });

    return object;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}

// Validate and enhance generated document
export async function enhanceGeneratedDocument(
  generatedContent: any,
  template: DocumentTemplate,
  additionalContext?: string
) {
  const model = getModel();

  const prompt = `
Review and enhance this generated clinical document for completeness and accuracy.

Document Type: ${template.name}
Generated Content: ${JSON.stringify(generatedContent, null, 2)}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Instructions:
1. Ensure all required fields are completed
2. Check for clinical accuracy and appropriate language
3. Add any missing critical information
4. Ensure consistency throughout the document
5. Flag any concerns or areas needing therapist review

Return the enhanced document with any recommended changes.
`;

  try {
    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 2000,
    });

    // Parse the enhanced content
    const enhanced = JSON.parse(text);

    return {
      enhanced,
      reviewNotes: enhanced._reviewNotes || [],
      requiresReview: enhanced._requiresReview || false,
    };
  } catch (error) {
    console.error('Error enhancing document:', error);
    return {
      enhanced: generatedContent,
      reviewNotes: ['Failed to enhance document'],
      requiresReview: true,
    };
  }
} 