# AWS Setup for Mental Health Platform

This document describes the AWS services configuration for the mental health platform's hybrid transcription system.

## Overview

The platform uses the following AWS services:
- **S3**: For storing session audio recordings
- **SQS**: For queueing batch processing jobs
- **Deepgram**: For medical transcription (external service)

## AWS Services Configuration

### 1. S3 Bucket

- **Bucket Name**: `app-bucket-medreport`
- **ARN**: `arn:aws:s3:::app-bucket-medreport`
- **Region**: `ap-southeast-2` (Asia Pacific - Sydney)

#### Bucket Configuration:
- Enable server-side encryption (AES-256)
- Set up lifecycle policies for 7-year retention (HIPAA compliance)
- Configure CORS for presigned URL uploads if needed

### 2. SQS Queue

- **Queue Name**: `MyQueue.fifo`
- **Queue URL**: `https://sqs.ap-southeast-2.amazonaws.com/643165769127/MyQueue.fifo`
- **ARN**: `arn:aws:sqs:ap-southeast-2:643165769127:MyQueue.fifo`
- **Type**: FIFO Queue (for ordered processing)

#### Queue Configuration:
- Message retention: 14 days
- Visibility timeout: 300 seconds (5 minutes)
- Receive message wait time: 20 seconds (long polling)

### 3. Deepgram API

- **API Key**: `f81aa8d7fd87658e762f08a3c1915d114494cc32`
- **Model**: `nova-2-medical` (medical transcription model)
- **Features**: Diarization, punctuation, medical terminology

## Environment Variables

Add these to your `.env` file:

```bash
# Deepgram Configuration
DEEPGRAM_API_KEY=f81aa8d7fd87658e762f08a3c1915d114494cc32
DEEPGRAM_MODEL=nova-2-medical
DEEPGRAM_LANGUAGE=en-US

# AWS Configuration
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# AWS S3 Configuration
AWS_S3_BUCKET=app-bucket-medreport
AWS_S3_BUCKET_ARN=arn:aws:s3:::app-bucket-medreport

# AWS SQS Configuration
AWS_SQS_QUEUE_NAME=MyQueue.fifo
AWS_SQS_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/643165769127/MyQueue.fifo
AWS_SQS_QUEUE_ARN=arn:aws:sqs:ap-southeast-2:643165769127:MyQueue.fifo
```

## Required Dependencies

Install the AWS SDK packages:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-sqs
```

## Running the System

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Start the Batch Processing Worker
In a separate terminal:
```bash
npm run worker:batch
```

## Architecture Flow

1. **Real-time Recording**:
   - Client records audio locally using MediaRecorder API
   - Audio chunks are streamed to WebSocket for real-time flag detection
   - Deepgram processes audio for immediate clinical flag identification

2. **Upload & Storage**:
   - Complete recording is uploaded to S3 via presigned URLs
   - File metadata is stored in the database
   - Upload triggers SQS message for batch processing

3. **Batch Processing**:
   - Worker polls SQS queue for new jobs
   - Downloads audio from S3 using presigned URLs
   - Performs full transcription with Deepgram medical model
   - Extracts all clinical flags and medical entities
   - Generates summaries and clinical documents
   - Stores results in database

## Security Considerations

1. **S3 Security**:
   - Use presigned URLs for temporary access
   - Enable server-side encryption
   - Implement proper IAM policies

2. **Data Privacy**:
   - Audio files are encrypted at rest
   - Access is controlled via presigned URLs
   - 7-year retention for HIPAA compliance

3. **Queue Security**:
   - FIFO queue ensures ordered processing
   - Messages are encrypted in transit
   - Failed messages go to dead letter queue

## Monitoring

- Monitor SQS queue depth for processing delays
- Track S3 storage usage and costs
- Monitor Deepgram API usage and costs
- Set up CloudWatch alarms for failures

## Troubleshooting

### Common Issues:

1. **Upload Failures**:
   - Check AWS credentials
   - Verify S3 bucket permissions
   - Check file size limits

2. **Queue Processing Issues**:
   - Verify SQS permissions
   - Check worker logs
   - Monitor dead letter queue

3. **Transcription Errors**:
   - Verify Deepgram API key
   - Check audio file format
   - Monitor API rate limits 