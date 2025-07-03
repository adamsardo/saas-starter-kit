# Cloudflare Setup for Mental Health Platform

This document describes how to set up Cloudflare's edge infrastructure for the mental health platform's hybrid transcription system.

## Why Cloudflare?

Cloudflare's edge infrastructure provides several advantages over traditional cloud providers:

1. **Edge Computing**: Process data closer to users for lower latency
2. **No Egress Fees**: R2 storage has no bandwidth charges
3. **Global Network**: 300+ edge locations worldwide
4. **Integrated Stack**: Storage (R2), Compute (Workers), Queues, and KV work seamlessly together
5. **Cost Effective**: Pay only for what you use, with generous free tiers

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js App │────▶│ Cloudflare  │
│  Recording  │     │   (Vercel)   │     │     R2      │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            │                     ▼
                            │              ┌─────────────┐
                            └─────────────▶│ CF Queues   │
                                          └─────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │ CF Workers  │
                                          │   (Edge)    │
                                          └─────────────┘
                                                 │
                                          ┌──────┴──────┐
                                          ▼             ▼
                                    ┌──────────┐  ┌──────────┐
                                    │ Deepgram │  │  OpenAI  │
                                    └──────────┘  └──────────┘
```

## Services Required

### 1. Cloudflare R2 (Object Storage)
- S3-compatible API
- No egress fees
- Automatic replication
- 10GB free storage

### 2. Cloudflare Queues
- Message queue service
- At-least-once delivery
- Automatic retries
- FIFO ordering available

### 3. Cloudflare Workers
- Edge compute platform
- Runs close to users
- Automatic scaling
- 100,000 requests/day free

### 4. Cloudflare KV
- Key-value storage
- Global replication
- Low latency reads
- 1GB free storage

## Setup Instructions

### Step 1: Create Cloudflare Account

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Note your Account ID from the dashboard

### Step 2: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### Step 3: Create R2 Bucket

```bash
# Create bucket for audio recordings
wrangler r2 bucket create medreport-recordings

# Enable CORS if needed
wrangler r2 bucket cors put medreport-recordings --rules '[
  {
    "allowedOrigins": ["https://your-app.com"],
    "allowedMethods": ["GET", "PUT", "POST"],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]'
```

### Step 4: Create Queue

```bash
# Create queue for batch processing jobs
wrangler queues create transcription-jobs
```

### Step 5: Create KV Namespace

```bash
# Create KV namespace for transcripts
wrangler kv:namespace create TRANSCRIPTS
```

### Step 6: Deploy Worker

```bash
cd workers/batch-processor

# Update wrangler.toml with your account ID and resource IDs

# Deploy the worker
wrangler deploy

# Set secrets
wrangler secret put OPENAI_API_KEY
```

### Step 7: Configure Environment Variables

Add to your `.env` file:

```bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# R2 Configuration
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET=medreport-recordings
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-bucket-url.com # Optional

# Queue Configuration
CLOUDFLARE_QUEUE_ID=your-queue-id

# Worker Configuration
CLOUDFLARE_WORKER_URL=https://batch-processor.your-subdomain.workers.dev
CLOUDFLARE_WORKER_NAME=batch-processor
CLOUDFLARE_KV_NAMESPACE=TRANSCRIPTS

# Deepgram (already configured)
DEEPGRAM_API_KEY=f81aa8d7fd87658e762f08a3c1915d114494cc32
```

## API Credentials

### Generate R2 API Token

1. Go to Cloudflare Dashboard > R2 > Manage API Tokens
2. Create token with permissions:
   - Account: R2 Read & Write
   - Bucket: Select your bucket

### Generate Queue API Token

1. Go to Cloudflare Dashboard > API Tokens
2. Create token with permissions:
   - Account: Cloudflare Queues Read & Write

## Usage

### Upload Audio to R2

```typescript
import { uploadSessionRecording } from '@/lib/cloudflare/r2';

const result = await uploadSessionRecording(
  teamId,
  sessionId,
  audioBuffer,
  'audio/webm'
);
```

### Queue Processing Job

```typescript
import { queueSessionForProcessing } from '@/lib/cloudflare/queues';

await queueSessionForProcessing(
  sessionId,
  teamId,
  audioUrl
);
```

### Check Job Status

```bash
# Via Worker endpoint
curl https://batch-processor.your-subdomain.workers.dev/status/{jobId}
```

## Monitoring

### Worker Analytics
- View in Cloudflare Dashboard > Workers & Pages
- Monitor requests, errors, CPU time

### Queue Metrics
- View in Cloudflare Dashboard > Queues
- Monitor message rates, processing times

### R2 Analytics
- View in Cloudflare Dashboard > R2
- Monitor storage usage, requests

## Cost Optimization

1. **R2 Storage**: 
   - $0.015/GB/month
   - No egress fees
   - Lifecycle rules for old recordings

2. **Workers**:
   - First 100k requests/day free
   - $0.50/million requests after

3. **Queues**:
   - First 1M messages/month free
   - $0.40/million after

4. **KV Storage**:
   - 1GB free
   - $0.50/GB/month after

## Security Best Practices

1. **Use Signed URLs**: Generate time-limited URLs for R2 access
2. **Encrypt at Rest**: Enable R2 encryption
3. **API Token Scoping**: Use minimal permissions
4. **Worker Secrets**: Store sensitive data as secrets
5. **CORS Configuration**: Restrict origins

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   ```bash
   wrangler r2 bucket cors put medreport-recordings --rules '[...]'
   ```

2. **Worker Timeout**:
   - Workers have 30s CPU time limit
   - Use Durable Objects for longer tasks

3. **Queue Delays**:
   - Check queue dashboard
   - Adjust batch size and timeout

4. **KV Limits**:
   - 25MB max value size
   - Consider chunking large transcripts

## Migration from AWS

If migrating from AWS:

1. **R2 is S3-compatible**: Minimal code changes needed
2. **Use rclone**: `rclone sync s3:bucket r2:bucket`
3. **Update endpoints**: Change S3 URLs to R2
4. **Queue migration**: Export/import messages

## Next Steps

1. Set up Cloudflare Analytics for monitoring
2. Configure Logpush for audit logs
3. Enable Argo Smart Routing for better performance
4. Consider Durable Objects for real-time features 