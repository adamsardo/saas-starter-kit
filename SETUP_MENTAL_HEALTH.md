# Mental Health Platform Setup Guide

This guide will walk you through setting up the complete mental health platform with all required services and integrations.

## 🚀 Quick Start

### Prerequisites

Before starting, ensure you have:
- **Node.js 18+** installed
- **PostgreSQL 14+** running
- **Git** for version control
- A **Deepgram account** for medical transcription
- An **OpenAI** or **Anthropic** account for AI document generation
- A **Clerk account** for authentication

## 📋 Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository (assuming you have the BoxyHQ starter kit)
git clone <your-repo-url>
cd your-mental-health-platform

# Install all dependencies including Deepgram SDK
npm install

# The mental health platform additions require:
npm install @deepgram/sdk
```

### 2. Database Setup

#### Create Database
```bash
# Using PostgreSQL (local or cloud)
createdb mental_health_platform

# Or using Docker
docker run --name postgres-mental-health \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=mental_health_platform \
  -p 5432:5432 \
  -d postgres:14
```

#### Run Migrations
```bash
# Push the schema to your database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Optional: Seed with sample data
npx prisma db seed
```

### 3. Service Account Setup

#### A. Deepgram Account Setup
1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Create a new account or sign in
3. Create a new project
4. Generate an API key
5. Note your API key for environment configuration

#### B. OpenAI Account Setup (Option 1)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create account and add billing information
3. Generate an API key
4. Note your API key and organization ID

#### C. Anthropic Account Setup (Option 2)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create account and request access
3. Generate an API key
4. Note your API key

#### D. Clerk Authentication Setup
1. Go to [Clerk Dashboard](https://dashboard.clerk.dev/)
2. Create a new application
3. Configure authentication providers
4. Set up organizations (teams)
5. Note your publishable key and secret key

### 4. Environment Configuration

Create a `.env.local` file in your project root:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mental_health_platform"

# Basic App Configuration
APP_URL="http://localhost:4002"
NEXTAUTH_URL="http://localhost:4002"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/auth/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/auth/join"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
CLERK_WEBHOOK_SECRET="whsec_..."

# Deepgram Configuration (REQUIRED)
DEEPGRAM_API_KEY="your_deepgram_api_key_here"
DEEPGRAM_MODEL="nova-3-medical"
DEEPGRAM_LANGUAGE="en"
DEEPGRAM_WEBHOOK_SECRET="your_webhook_secret"

# Deepgram Features
FEATURE_DEEPGRAM_ENABLED="true"
FEATURE_DEEPGRAM_REALTIME="true"
DEEPGRAM_DIARIZATION="true"
DEEPGRAM_PUNCTUATION="true"
DEEPGRAM_SMART_FORMATTING="true"
DEEPGRAM_SAMPLE_RATE="16000"
DEEPGRAM_CHANNELS="1"

# AI Configuration (Choose OpenAI OR Anthropic)
OPENAI_API_KEY="sk-..."
OPENAI_ORGANIZATION="org-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Mental Health Platform Features
FEATURE_SESSION_RECORDING="true"
FEATURE_AUTO_TRANSCRIBE="true"
FEATURE_AUTO_GENERATE_NOTES="true"
FEATURE_RISK_ASSESSMENT="true"
FEATURE_AUTO_RISK_TRIGGERS="true"
FEATURE_EMERGENCY_NOTIFICATIONS="true"
FEATURE_DOCUMENT_GENERATION="true"

# HIPAA Compliance
MENTAL_HEALTH_HIPAA_COMPLIANT="true"
MENTAL_HEALTH_AUDIT_LOGGING="true"

# AI Model Configuration
AI_DEFAULT_MODEL="gpt-4o"
DOCUMENT_AI_MODEL="gpt-4o"
AI_MAX_TOKENS="4000"
AI_TEMPERATURE="0.3"

# Session Configuration
SESSION_MAX_DURATION="120"
```

### 5. Configure Clerk Organizations

#### Set up Team-based Access
1. In Clerk Dashboard, enable Organizations
2. Configure organization roles:
   - `org:admin` → CLINICAL_ADMIN
   - `org:supervisor` → SUPERVISOR  
   - `org:member` → THERAPIST

#### Webhook Configuration
1. In Clerk Dashboard, go to Webhooks
2. Add a new webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events: `user.created`, `user.updated`, `organization.created`, `organizationMembership.created`
4. Copy the webhook secret to your environment variables

### 6. Development Server

```bash
# Start the development server
npm run dev

# The application will be available at:
# http://localhost:4002
```

### 7. Initial Setup and Testing

#### Create Your First Organization
1. Open http://localhost:4002
2. Sign up for a new account
3. Create your first organization (clinical practice)
4. Invite team members with appropriate roles

#### Test Transcription
1. Ensure microphone permissions are granted
2. Create a test patient (with recording consent)
3. Schedule a test session
4. Test the session recorder with live transcription

#### Verify AI Document Generation
1. Complete a session with transcription
2. Generate session notes using AI
3. Review and approve the generated document

## 🔧 Advanced Configuration

### Custom Medical Keywords

Add therapy-specific terms to improve transcription accuracy:

```bash
# In .env.local
DEEPGRAM_KEYWORDS="CBT,DBT,EMDR,trauma therapy,mindfulness,exposure therapy"
```

### Crisis Detection Keywords

The system comes pre-configured with crisis detection, but you can customize:

```typescript
// In lib/deepgram.ts, modify the crisisKeywords array
const crisisKeywords = [
  'suicide', 'suicidal', 'self harm',
  // Add your specific terms
  'custom crisis term'
];
```

### Document Templates

Create custom templates for your practice:

1. Go to `/mental-health/templates`
2. Create new templates for your therapy modalities
3. Set template visibility (private/team/public)

## 🚨 Security Configuration

### HIPAA Compliance Setup

#### SSL/TLS Certificate
```bash
# For production, ensure SSL is configured
# Use Let's Encrypt or your SSL provider
```

#### Audit Logging
```bash
# Enable comprehensive audit logging
MENTAL_HEALTH_AUDIT_LOGGING="true"
RETRACED_API_KEY="your_retraced_key"
RETRACED_PROJECT_ID="your_project_id"
```

#### Data Encryption
```bash
# Ensure database encryption at rest
# Configure your PostgreSQL instance with encryption
```

### Access Control Testing

Test role-based access:

1. **THERAPIST Role**:
   - Can only see assigned patients
   - Can record and transcribe sessions
   - Can generate documents for their patients

2. **SUPERVISOR Role**:
   - Can see all team patients
   - Can review all sessions and documents
   - Can approve clinical documents

3. **CLINICAL_ADMIN Role**:
   - Full access to all team data
   - Can manage team settings
   - Can configure templates and workflows

## 📊 Production Deployment

### Environment Setup

#### Database
```bash
# Use a managed PostgreSQL service
# Examples: AWS RDS, Google Cloud SQL, Supabase
DATABASE_URL="postgresql://user:pass@prod-db:5432/mental_health"
```

#### File Storage
```bash
# Configure secure file storage for audio files
# Examples: AWS S3, Google Cloud Storage
```

#### Monitoring
```bash
# Set up application monitoring
SENTRY_DSN="your_sentry_dsn"
```

### Deployment Checklist

- [ ] SSL certificate configured
- [ ] Database encryption enabled
- [ ] Audit logging configured
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting set up
- [ ] HIPAA compliance verified
- [ ] Security review completed
- [ ] User training completed

## 🧪 Testing Your Setup

### 1. Basic Functionality Test
```bash
# Run the test suite
npm run test

# Run end-to-end tests
npm run test:e2e
```

### 2. Integration Tests

#### Deepgram Integration
1. Test real-time transcription
2. Test pre-recorded transcription
3. Verify medical terminology accuracy
4. Test speaker diarization

#### AI Document Generation
1. Test session note generation
2. Test treatment plan creation
3. Verify template system
4. Test approval workflow

#### Crisis Detection
1. Test with crisis keywords
2. Verify automatic risk assessment creation
3. Test notification system

### 3. Performance Testing

#### Load Testing
```bash
# Test concurrent sessions
# Monitor transcription latency
# Verify database performance
```

## 🔍 Troubleshooting

### Common Issues

#### Transcription Not Working
1. Check Deepgram API key
2. Verify microphone permissions
3. Check browser compatibility
4. Review network connectivity

#### Authentication Issues
1. Verify Clerk configuration
2. Check webhook endpoints
3. Review organization settings
4. Validate environment variables

#### Database Connection
1. Check DATABASE_URL format
2. Verify PostgreSQL is running
3. Check network connectivity
4. Review Prisma configuration

### Support Resources

1. **Deepgram Documentation**: https://developers.deepgram.com/
2. **Clerk Documentation**: https://clerk.dev/docs
3. **Prisma Documentation**: https://www.prisma.io/docs
4. **Next.js Documentation**: https://nextjs.org/docs

## 📞 Getting Help

If you encounter issues:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Verify all environment variables are set
4. Test individual components separately
5. Create a detailed issue report

---

**Important**: This platform handles sensitive medical information. Ensure all security requirements are met before processing real patient data.