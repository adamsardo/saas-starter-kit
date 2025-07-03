import { prisma } from '@/lib/prisma';

interface QueueJob {
  id: string;
  sessionId: string;
  teamId: string;
  type: 'transcript_processing' | 'document_generation';
  attempts: number;
  createdAt: Date;
}

class BatchProcessingQueue {
  private queue: QueueJob[] = [];
  private processing = false;
  private maxConcurrent = 2;
  private activeJobs = 0;

  // Add job to queue
  async enqueue(job: Omit<QueueJob, 'id' | 'attempts' | 'createdAt'>) {
    const newJob: QueueJob = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      attempts: 0,
      createdAt: new Date(),
    };

    this.queue.push(newJob);
    console.log(`Job ${newJob.id} added to queue. Queue length: ${this.queue.length}`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return newJob.id;
  }

  // Process jobs in the queue
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeJobs < this.maxConcurrent) {
      const job = this.queue.shift();
      if (!job) continue;

      this.activeJobs++;
      
      // Process job asynchronously
      this.processJob(job)
        .then(() => {
          console.log(`Job ${job.id} completed successfully`);
        })
        .catch((error) => {
          console.error(`Job ${job.id} failed:`, error);
          
          // Retry logic
          job.attempts++;
          if (job.attempts < 3) {
            // Re-add to queue for retry
            setTimeout(() => {
              this.queue.push(job);
              if (!this.processing) {
                this.processQueue();
              }
            }, Math.pow(2, job.attempts) * 1000); // Exponential backoff
          }
        })
        .finally(() => {
          this.activeJobs--;
          
          // Continue processing if there are more jobs
          if (this.queue.length > 0 && !this.processing) {
            this.processQueue();
          }
        });
    }

    this.processing = false;
  }

  // Process individual job
  private async processJob(job: QueueJob) {
    console.log(`Processing job ${job.id} (attempt ${job.attempts + 1})`);

    switch (job.type) {
      case 'transcript_processing':
        // This would normally call the batch processing logic
        // For now, we'll just log
        console.log(`Processing transcript for session ${job.sessionId}`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // TODO: Call actual processing logic
        break;

      case 'document_generation':
        console.log(`Generating document for session ${job.sessionId}`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // TODO: Call actual document generation logic
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs,
      processing: this.processing,
    };
  }

  // Get jobs for a specific session
  getJobsForSession(sessionId: string) {
    return this.queue.filter(job => job.sessionId === sessionId);
  }
}

// Export singleton instance
export const batchProcessingQueue = new BatchProcessingQueue();

// Helper function to check job status from database
export async function getJobStatus(jobId: string) {
  // TODO: Uncomment after running prisma generate
  // const job = await prisma.batchProcessingJob.findUnique({
  //   where: { id: jobId },
  // });
  
  // return job;
  
  // For now, return mock data
  return {
    id: jobId,
    status: 'processing',
    createdAt: new Date(),
  };
}

// Helper function to get all jobs for a session
export async function getSessionJobs(sessionId: string) {
  // TODO: Uncomment after running prisma generate
  // const jobs = await prisma.batchProcessingJob.findMany({
  //   where: { sessionId },
  //   orderBy: { createdAt: 'desc' },
  // });
  
  // return jobs;
  
  // For now, return empty array
  return [];
} 