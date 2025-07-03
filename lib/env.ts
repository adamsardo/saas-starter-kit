import type { SessionStrategy } from 'next-auth';

const env = {
  databaseUrl: `${process.env.DATABASE_URL}`,
  appUrl: `${process.env.APP_URL}`,
  redirectIfAuthenticated: '/dashboard',
  securityHeadersEnabled: process.env.SECURITY_HEADERS_ENABLED ?? false,

  // SMTP configuration for NextAuth
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  },

  // NextAuth configuration (to be removed after migration)
  nextAuth: {
    secret: process.env.NEXTAUTH_SECRET,
    sessionStrategy: (process.env.NEXTAUTH_SESSION_STRATEGY ||
      'jwt') as SessionStrategy,
  },

  // Clerk configuration
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
    secretKey: process.env.CLERK_SECRET_KEY || '',
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/login',
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/auth/join',
    afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard',
    afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard',
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
  },

  // Svix
  svix: {
    url: `${process.env.SVIX_URL}`,
    apiKey: `${process.env.SVIX_API_KEY}`,
  },

  //Social login: Github
  github: {
    clientId: `${process.env.GITHUB_CLIENT_ID}`,
    clientSecret: `${process.env.GITHUB_CLIENT_SECRET}`,
  },

  //Social login: Google
  google: {
    clientId: `${process.env.GOOGLE_CLIENT_ID}`,
    clientSecret: `${process.env.GOOGLE_CLIENT_SECRET}`,
  },

  // Retraced configuration
  retraced: {
    url: process.env.RETRACED_URL
      ? `${process.env.RETRACED_URL}/auditlog`
      : undefined,
    apiKey: process.env.RETRACED_API_KEY,
    projectId: process.env.RETRACED_PROJECT_ID,
  },

  groupPrefix: process.env.GROUP_PREFIX,

  // SAML Jackson configuration
  jackson: {
    url: process.env.JACKSON_URL,
    externalUrl: process.env.JACKSON_EXTERNAL_URL || process.env.JACKSON_URL,
    apiKey: process.env.JACKSON_API_KEY,
    productId: process.env.JACKSON_PRODUCT_ID || 'boxyhq',
    selfHosted: process.env.JACKSON_URL !== undefined,
    sso: {
      callback: `${process.env.APP_URL}`,
      issuer: 'https://saml.boxyhq.com',
      path: '/api/oauth/saml',
      oidcPath: '/api/oauth/oidc',
      idpLoginPath: '/auth/idp-login',
    },
    dsync: {
      webhook_url: `${process.env.APP_URL}/api/webhooks/dsync`,
      webhook_secret: process.env.JACKSON_WEBHOOK_SECRET,
    },
  },

  // Users will need to confirm their email before accessing the app feature
  confirmEmail: process.env.CONFIRM_EMAIL === 'true',

  // Mixpanel configuration
  mixpanel: {
    token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
  },

  disableNonBusinessEmailSignup:
    process.env.DISABLE_NON_BUSINESS_EMAIL_SIGNUP === 'true',

  authProviders: process.env.AUTH_PROVIDERS || 'github,credentials',

  otel: {
    prefix: process.env.OTEL_PREFIX || 'boxyhq.saas',
  },

  hideLandingPage: process.env.HIDE_LANDING_PAGE === 'true',

  darkModeEnabled: process.env.NEXT_PUBLIC_DARK_MODE !== 'false',

  teamFeatures: {
    sso: process.env.FEATURE_TEAM_SSO !== 'false',
    dsync: process.env.FEATURE_TEAM_DSYNC !== 'false',
    webhook: process.env.FEATURE_TEAM_WEBHOOK !== 'false',
    apiKey: process.env.FEATURE_TEAM_API_KEY !== 'false',
    auditLog: process.env.FEATURE_TEAM_AUDIT_LOG !== 'false',
    payments:
      process.env.FEATURE_TEAM_PAYMENTS === 'false'
        ? false
        : Boolean(
            process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
          ),
    deleteTeam: process.env.FEATURE_TEAM_DELETION !== 'false',
  },

  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY || null,
    secretKey: process.env.RECAPTCHA_SECRET_KEY || null,
  },

  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS) || 5,

  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  // AI SDK configuration
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    // Optional: Add more providers as needed
    google: {
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY,
    },
    // Feature flags for AI features
    enabled: process.env.FEATURE_AI_ENABLED !== 'false',
    defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 2048,
    temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
    // Rate limiting for AI features
    rateLimitPerUser: Number(process.env.AI_RATE_LIMIT_PER_USER) || 100,
    rateLimitWindow: Number(process.env.AI_RATE_LIMIT_WINDOW) || 3600, // 1 hour in seconds
  },

  // Deepgram configuration for medical transcription
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || 'f81aa8d7fd87658e762f08a3c1915d114494cc32',
    model: process.env.DEEPGRAM_MODEL || 'nova-3-medical',
    language: process.env.DEEPGRAM_LANGUAGE || 'en-US',
    // Medical model specific settings
    medical: {
      enabled: process.env.DEEPGRAM_MEDICAL_ENABLED !== 'false',
      vocabulary: process.env.DEEPGRAM_MEDICAL_VOCABULARY?.split(',') || [],
      diarize: process.env.DEEPGRAM_DIARIZE !== 'false', // Speaker identification
      punctuate: process.env.DEEPGRAM_PUNCTUATE !== 'false',
      profanityFilter: process.env.DEEPGRAM_PROFANITY_FILTER === 'true',
      redact: process.env.DEEPGRAM_REDACT?.split(',') || [], // PII redaction
      numerals: process.env.DEEPGRAM_NUMERALS !== 'false',
    },
  },

  // Mental Health Platform specific settings
  mentalHealth: {
    // Session recording settings
    maxSessionDuration: Number(process.env.MAX_SESSION_DURATION) || 90, // minutes
    autoSaveInterval: Number(process.env.AUTO_SAVE_INTERVAL) || 30, // seconds
    // Document generation settings
    defaultTemplateModality: process.env.DEFAULT_TEMPLATE_MODALITY || 'CBT',
    // Security settings
    encryptPatientData: process.env.ENCRYPT_PATIENT_DATA !== 'false',
    auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS) || 2555, // 7 years for HIPAA
    // Crisis management
    crisisHotline: process.env.CRISIS_HOTLINE || '988',
    emergencyProtocolUrl: process.env.EMERGENCY_PROTOCOL_URL || '/protocols/emergency',
  },

  // Cloudflare configuration (preferred over AWS)
  cloudflare: {
    // R2 Storage configuration
    r2: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
      bucketName: process.env.CLOUDFLARE_R2_BUCKET || 'medreport-recordings',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
      publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || '', // If using public bucket
      workerUrl: process.env.CLOUDFLARE_WORKER_URL || 'https://transcripts.adamsardo98.workers.dev', // Worker endpoint
    },
    // Queues configuration
    queues: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      queueId: process.env.CLOUDFLARE_QUEUE_ID || '',
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    },
    // Workers configuration
    workers: {
      scriptName: process.env.CLOUDFLARE_WORKER_NAME || 'transcripts',
      kvNamespace: process.env.CLOUDFLARE_KV_NAMESPACE || 'TRANSCRIPTS',
    },
  },

  // AWS configuration (kept for compatibility, but Cloudflare is preferred)
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-2',
    s3: {
      bucketName: process.env.AWS_S3_BUCKET || 'app-bucket-medreport',
      bucketArn: process.env.AWS_S3_BUCKET_ARN || 'arn:aws:s3:::app-bucket-medreport',
    },
    sqs: {
      queueName: process.env.AWS_SQS_QUEUE_NAME || 'MyQueue.fifo',
      queueUrl: process.env.AWS_SQS_QUEUE_URL || 'https://sqs.ap-southeast-2.amazonaws.com/643165769127/MyQueue.fifo',
      queueArn: process.env.AWS_SQS_QUEUE_ARN || 'arn:aws:sqs:ap-southeast-2:643165769127:MyQueue.fifo',
    },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

export default env;
