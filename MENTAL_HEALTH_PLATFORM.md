# Mental Health Platform Documentation

## Overview

This mental health platform is built on top of the BoxyHQ SaaS Starter Kit to provide comprehensive clinical documentation and transcription services for mental health professionals. It leverages cutting-edge AI technology including Deepgram Nova-3 Medical model for high-accuracy medical transcription and OpenAI/Anthropic models for clinical document generation.

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15.x with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk with organization-based teams
- **Transcription**: Deepgram Nova-3 Medical model
- **AI Document Generation**: OpenAI GPT-4o / Anthropic Claude-3.5-Sonnet
- **Styling**: Tailwind CSS + DaisyUI
- **Real-time**: Server-Sent Events for live transcription

### Key Features
- **Real-time Medical Transcription** with Deepgram Nova-3 Medical
- **Clinical Document Generation** using AI
- **HIPAA-Compliant** architecture and data handling
- **Role-Based Access Control** for mental health teams
- **Crisis Detection** and automatic risk assessments
- **Treatment Planning** and progress tracking
- **Session Recording** with consent management

## 🔐 Security & Compliance

### HIPAA Compliance
- **Data Encryption**: All data encrypted in transit and at rest
- **Access Controls**: Role-based permissions with audit logging
- **Patient Consent**: Required consent for session recording
- **Data Retention**: Configurable retention policies
- **Audit Trails**: Comprehensive logging of all access and changes

### Role-Based Access Control

#### Roles
1. **THERAPIST**
   - Can manage their assigned patients
   - Full access to their own sessions and documents
   - Can create and use document templates
   - Can perform transcription for their sessions

2. **SUPERVISOR**
   - Can review all team sessions and documents
   - Can approve clinical documents
   - Can manage therapist assignments
   - Can access all patient records in their team

3. **CLINICAL_ADMIN**
   - Full administrative access
   - Can manage team settings and access policies
   - Can access all clinical data
   - Can manage document templates and workflows

## 📋 Database Schema

### Core Mental Health Models

#### Patient
```prisma
model Patient {
  id                String   @id @default(uuid())
  firstName         String
  lastName          String
  dateOfBirth       DateTime
  email             String?
  phone             String?
  emergencyContact  String?
  emergencyPhone    String?
  
  // Clinical Information
  primaryDiagnosis  String?
  secondaryDiagnoses String[]
  medications       String[]
  allergies         String[]
  
  // Assignment and Access
  teamId            String
  assignedTherapistId String?
  
  // Privacy and Security
  consentForRecording Boolean @default(false)
  hipaaAcknowledged   Boolean @default(false)
  
  // Relationships
  sessions          TherapySession[]
  documents         ClinicalDocument[]
  treatmentPlans    TreatmentPlan[]
  riskAssessments   RiskAssessment[]
}
```

#### TherapySession
```prisma
model TherapySession {
  id                String   @id @default(uuid())
  patientId         String
  therapistId       String
  teamId            String
  
  // Session Details
  sessionType       SessionType @default(INDIVIDUAL)
  modality          TherapyModality @default(CBT)
  scheduledAt       DateTime
  startedAt         DateTime?
  endedAt           DateTime?
  duration          Int? // minutes
  
  // Session Status
  status            SessionStatus @default(SCHEDULED)
  location          String?
  
  // Recording and Transcription
  hasRecording      Boolean @default(false)
  audioFileUrl      String?
  transcriptionText String? @db.Text
  
  // Clinical Notes
  soapNotes         String? @db.Text
  progressNotes     String? @db.Text
  interventions     String[] @default([])
  
  // Risk and Safety
  riskLevel         RiskLevel @default(LOW)
  safetyPlan        String?
  crisisFlags       String[]
}
```

## 🎤 Transcription System

### Deepgram Nova-3 Medical Integration

The platform uses Deepgram's Nova-3 Medical model, specifically designed for clinical environments:

#### Key Features
- **3.44% median WER** (63.7% improvement over competitors)
- **6.79% KER** (40.35% improvement in medical terminology)
- **HIPAA-compliant** architecture
- **Keyterm Prompting** for up to 100 custom medical terms
- **Speaker diarization** to differentiate therapist and patient
- **Real-time processing** with <2 second latency

#### Medical Keywords
Pre-configured with mental health specific terminology:
- Common medications (sertraline, fluoxetine, lithium, etc.)
- Therapy modalities (CBT, DBT, EMDR, ACT, etc.)
- Assessment tools (PHQ-9, GAD-7, CAPS-5, etc.)
- Clinical terms (depression, anxiety, trauma, PTSD, etc.)

### Real-time Transcription API

```typescript
// API Endpoint: /api/transcription/realtime
// Method: POST (Server-Sent Events)
// Requires: sessionId, optional customKeywords

const eventSource = new EventSource('/api/transcription/realtime');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle transcription events
};
```

### Pre-recorded Transcription API

```typescript
// API Endpoint: /api/transcription/prerecorded
// Method: POST
// Requires: sessionId, audioUrl, optional customKeywords

const response = await fetch('/api/transcription/prerecorded', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'session-uuid',
    audioUrl: 'https://example.com/audio.wav',
    customKeywords: ['therapy-specific', 'terms']
  })
});
```

## 🤖 AI Document Generation

### Supported Document Types
- **Session Notes** (SOAP format)
- **Treatment Plans**
- **Progress Reports** 
- **Assessment Summaries**
- **Insurance Authorization Forms**
- **Crisis Intervention Reports**

### Template System
The platform includes pre-built templates for different therapeutic modalities:
- Cognitive Behavioral Therapy (CBT)
- Dialectical Behavior Therapy (DBT)
- Eye Movement Desensitization and Reprocessing (EMDR)
- Acceptance and Commitment Therapy (ACT)
- Psychodynamic Therapy
- Trauma-Informed Care

### AI Generation Process
1. **Transcription Analysis**: AI analyzes session transcript
2. **Template Selection**: Appropriate template chosen based on modality
3. **Content Generation**: AI generates clinical content using configured model
4. **Professional Review**: Therapist reviews and edits generated document
5. **Approval Workflow**: Supervisor approval if required
6. **Finalization**: Document marked as final and stored

## 🚨 Crisis Detection & Risk Assessment

### Automatic Crisis Detection
The system automatically scans transcriptions for crisis indicators:
- Suicidal ideation keywords
- Self-harm mentions
- Homicidal ideation
- Substance abuse concerns
- Domestic violence indicators

### Risk Assessment Workflow
1. **Real-time Monitoring**: Continuous scanning during transcription
2. **Automatic Flagging**: High-risk content immediately flagged
3. **Risk Assessment Creation**: Automatic risk assessment generated
4. **Notification System**: Alerts sent to appropriate team members
5. **Intervention Protocols**: Crisis protocols activated if needed

## 📱 User Interface Components

### SessionRecorder Component
```tsx
<SessionRecorder
  sessionId="session-uuid"
  patientName="Patient Name"
  onTranscriptionUpdate={(transcript) => handleUpdate(transcript)}
  onSessionEnd={() => handleSessionEnd()}
/>
```

Features:
- One-click recording start
- Real-time audio level monitoring
- Live transcription display with speaker identification
- Session controls (pause, resume, stop)
- Important moment marking
- Private note-taking during session

### Dashboard Component
```tsx
<MentalHealthDashboard />
```

Features:
- Daily session overview
- Patient list with risk indicators
- Clinical statistics dashboard
- Quick action buttons
- Document management interface

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_api_key
DEEPGRAM_MODEL=nova-3-medical
DEEPGRAM_LANGUAGE=en
DEEPGRAM_WEBHOOK_SECRET=your_webhook_secret

# Mental Health Platform Features
FEATURE_DEEPGRAM_ENABLED=true
FEATURE_DEEPGRAM_REALTIME=true
FEATURE_SESSION_RECORDING=true
FEATURE_AUTO_TRANSCRIBE=true
FEATURE_AUTO_GENERATE_NOTES=true
FEATURE_RISK_ASSESSMENT=true
FEATURE_AUTO_RISK_TRIGGERS=true
FEATURE_EMERGENCY_NOTIFICATIONS=true

# HIPAA Compliance
MENTAL_HEALTH_HIPAA_COMPLIANT=true
MENTAL_HEALTH_AUDIT_LOGGING=true

# AI Configuration
DOCUMENT_AI_MODEL=gpt-4o
FEATURE_DOCUMENT_GENERATION=true
```

### Deepgram Features Configuration
```bash
DEEPGRAM_DIARIZATION=true
DEEPGRAM_PUNCTUATION=true
DEEPGRAM_SMART_FORMATTING=true
DEEPGRAM_KEYWORDS=specialized,therapy,terms
```

## 🚀 Installation & Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Deepgram API Account
- OpenAI or Anthropic API Account
- Clerk Account

### 2. Database Setup
```bash
# Install dependencies
npm install @deepgram/sdk

# Run database migrations
npx prisma db push

# Seed with sample data (optional)
npx prisma db seed
```

### 3. Environment Setup
1. Copy `.env.example` to `.env.local`
2. Configure all required environment variables
3. Set up Clerk authentication
4. Configure Deepgram API credentials

### 4. Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:4002`

## 📊 Performance Metrics

### Transcription Performance
- **Latency**: <2 seconds for real-time transcription
- **Accuracy**: >95% for medical terminology
- **Throughput**: Supports concurrent sessions
- **Uptime**: 99.9% availability target

### Document Generation
- **Speed**: <30 seconds for standard session notes
- **Quality**: Professional-grade clinical documentation
- **Customization**: Therapy-specific templates
- **Review Workflow**: Built-in approval process

## 🔒 Security Best Practices

### Data Protection
1. **Encryption**: All data encrypted using AES-256
2. **Access Logs**: All access attempts logged and monitored
3. **Session Management**: Secure session handling with automatic timeouts
4. **API Security**: Rate limiting and request validation
5. **File Storage**: Secure cloud storage with access controls

### Privacy Controls
1. **Patient Consent**: Required for all recording activities
2. **Data Minimization**: Only necessary data collected
3. **Right to Deletion**: Patient data deletion capabilities
4. **Access Restrictions**: Role-based data access
5. **Audit Trails**: Complete audit logging

## 📞 API Reference

### Mental Health Endpoints

#### Sessions
- `GET /api/mental-health/sessions` - List sessions
- `POST /api/mental-health/sessions` - Create session
- `GET /api/mental-health/sessions/:id` - Get session details
- `PUT /api/mental-health/sessions/:id` - Update session
- `DELETE /api/mental-health/sessions/:id` - Delete session

#### Patients
- `GET /api/mental-health/patients` - List patients
- `POST /api/mental-health/patients` - Create patient
- `GET /api/mental-health/patients/:id` - Get patient details
- `PUT /api/mental-health/patients/:id` - Update patient
- `DELETE /api/mental-health/patients/:id` - Delete patient

#### Transcription
- `POST /api/transcription/realtime` - Start real-time transcription
- `POST /api/transcription/prerecorded` - Process audio file
- `GET /api/transcription/jobs/:id` - Get transcription status

#### Documents
- `GET /api/mental-health/documents` - List documents
- `POST /api/mental-health/documents/generate` - Generate document
- `PUT /api/mental-health/documents/:id/approve` - Approve document

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Test Coverage
- API endpoints
- React components
- Database operations
- Authentication flows
- Transcription integration

## 📈 Monitoring & Analytics

### Key Metrics
- Session completion rates
- Transcription accuracy
- Document generation success
- Crisis detection effectiveness
- User engagement metrics

### Health Checks
- Database connectivity
- Deepgram API status
- AI service availability
- File storage accessibility

## 🤝 Contributing

This platform follows the BoxyHQ SaaS Starter Kit contribution guidelines. Please ensure:

1. HIPAA compliance in all features
2. Comprehensive testing for clinical features
3. Documentation updates for new functionality
4. Security review for sensitive operations

## 📄 License

This platform inherits the license from the BoxyHQ SaaS Starter Kit. Please review the LICENSE file for details.

## 🆘 Support

For support and questions:
1. Check the documentation
2. Review the API reference
3. Check existing issues
4. Create a new issue with detailed information

---

**Note**: This platform handles sensitive medical information. Always ensure compliance with local healthcare regulations and privacy laws before deployment in a production environment.