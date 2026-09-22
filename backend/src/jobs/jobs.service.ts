import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('reports') private reportsQueue: Queue,
    @InjectQueue('working-papers') private workingPapersQueue: Queue,
  ) {}

  private getQueueByName(queueName: string): Queue {
    switch (queueName) {
      case 'reports':
        return this.reportsQueue;
      case 'working-papers':
        return this.workingPapersQueue;
      default:
        throw new NotFoundException(`Queue "${queueName}" not found`);
    }
  }

  async getQueuesSummary() {
    const queues = [
      { name: 'reports', queue: this.reportsQueue },
      { name: 'working-papers', queue: this.workingPapersQueue },
    ];

    const summaries = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const [waiting, active, completed, failed, delayed, paused] =
          await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
            queue.isPaused(),
          ]);

        return {
          queueName: name,
          isPaused: paused,
          counts: {
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed,
          },
        };
      }),
    );

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      queues: summaries,
    };
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queue = this.getQueueByName(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `Job ${jobId} not found in queue ${queueName}`,
      );
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnvalue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      name: job.name,
      state,
      progress,
      result: returnvalue,
      failedReason,
      createdAt: job.timestamp,
      finishedOn: job.finishedOn,
    };
  }

  async retryFailedJobs(queueName: string) {
    const queue = this.getQueueByName(queueName);
    const failedJobs = await queue.getFailed();
    await Promise.all(failedJobs.map((job) => job.retry()));
    return {
      success: true,
      message: `Retried ${failedJobs.length} failed jobs in queue "${queueName}"`,
      retriedCount: failedJobs.length,
    };
  }

  async cleanQueue(queueName: string, gracePeriodMs = 1000) {
    const queue = this.getQueueByName(queueName);
    const [cleanedCompleted, cleanedFailed] = await Promise.all([
      queue.clean(gracePeriodMs, 100, 'completed'),
      queue.clean(gracePeriodMs, 100, 'failed'),
    ]);

    return {
      success: true,
      queueName,
      cleanedCompletedCount: cleanedCompleted.length,
      cleanedFailedCount: cleanedFailed.length,
    };
  }
}
