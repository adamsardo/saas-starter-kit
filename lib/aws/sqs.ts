import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import env from '@/lib/env';

// Initialize SQS client
const sqsClient = new SQSClient({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

export interface QueueMessage {
  id: string;
  sessionId: string;
  teamId: string;
  type: 'transcript_processing' | 'document_generation';
  data: any;
  timestamp: number;
}

/**
 * Send a message to the SQS queue
 */
export async function sendToQueue(message: QueueMessage) {
  // For FIFO queues, we need MessageGroupId and MessageDeduplicationId
  const command = new SendMessageCommand({
    QueueUrl: env.aws.sqs.queueUrl,
    MessageBody: JSON.stringify(message),
    MessageGroupId: message.teamId, // Group by team for FIFO ordering
    MessageDeduplicationId: `${message.id}-${message.timestamp}`,
    MessageAttributes: {
      type: {
        StringValue: message.type,
        DataType: 'String',
      },
      sessionId: {
        StringValue: message.sessionId,
        DataType: 'String',
      },
      teamId: {
        StringValue: message.teamId,
        DataType: 'String',
      },
    },
  });

  try {
    const response = await sqsClient.send(command);
    console.log(`Message sent to queue: ${response.MessageId}`);
    return {
      success: true,
      messageId: response.MessageId,
      sequenceNumber: response.SequenceNumber,
    };
  } catch (error) {
    console.error('SQS send error:', error);
    throw new Error(`Failed to send message to queue: ${error}`);
  }
}

/**
 * Receive messages from the queue
 */
export async function receiveFromQueue(maxMessages: number = 1) {
  const command = new ReceiveMessageCommand({
    QueueUrl: env.aws.sqs.queueUrl,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: 20, // Long polling
    MessageAttributeNames: ['All'],
    VisibilityTimeout: 300, // 5 minutes to process
  });

  try {
    const response = await sqsClient.send(command);
    
    if (!response.Messages || response.Messages.length === 0) {
      return [];
    }

    return response.Messages.map(msg => ({
      messageId: msg.MessageId,
      receiptHandle: msg.ReceiptHandle,
      body: JSON.parse(msg.Body || '{}') as QueueMessage,
      attributes: msg.MessageAttributes,
    }));
  } catch (error) {
    console.error('SQS receive error:', error);
    throw new Error(`Failed to receive messages from queue: ${error}`);
  }
}

/**
 * Delete a message from the queue after processing
 */
export async function deleteFromQueue(receiptHandle: string) {
  const command = new DeleteMessageCommand({
    QueueUrl: env.aws.sqs.queueUrl,
    ReceiptHandle: receiptHandle,
  });

  try {
    await sqsClient.send(command);
    console.log('Message deleted from queue');
    return { success: true };
  } catch (error) {
    console.error('SQS delete error:', error);
    throw new Error(`Failed to delete message from queue: ${error}`);
  }
}

/**
 * Queue a session for batch processing
 */
export async function queueSessionForProcessing(
  sessionId: string,
  teamId: string,
  audioUrl: string
) {
  const message: QueueMessage = {
    id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    teamId,
    type: 'transcript_processing',
    data: {
      audioUrl,
      requestedAt: new Date().toISOString(),
    },
    timestamp: Date.now(),
  };

  return await sendToQueue(message);
}

/**
 * Queue a document generation job
 */
export async function queueDocumentGeneration(
  sessionId: string,
  teamId: string,
  transcriptId: string,
  documentType: string
) {
  const message: QueueMessage = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    teamId,
    type: 'document_generation',
    data: {
      transcriptId,
      documentType,
      requestedAt: new Date().toISOString(),
    },
    timestamp: Date.now(),
  };

  return await sendToQueue(message);
} 