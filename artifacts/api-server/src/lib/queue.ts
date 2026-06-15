import { logger } from "./logger";

type JobHandler<T> = (data: T) => Promise<void>;

interface Job<T> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
}

class InMemoryQueue<T = unknown> {
  private handlers = new Map<string, JobHandler<T>>();
  private processing = false;
  private queue: Job<T>[] = [];

  process(name: string, handler: JobHandler<T>) {
    this.handlers.set(name, handler);
  }

  async add(name: string, data: T, opts?: { delay?: number }) {
    const job: Job<T> = {
      id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      data,
      attempts: 0,
      maxAttempts: 3,
    };

    const runJob = async () => {
      const handler = this.handlers.get(name);
      if (!handler) return;
      try {
        await handler(data);
        logger.debug({ jobId: job.id, name }, "Queue job completed");
      } catch (err) {
        job.attempts++;
        logger.warn({ err, jobId: job.id, name, attempt: job.attempts }, "Queue job failed");
        if (job.attempts < job.maxAttempts) {
          setTimeout(() => runJob(), 2000 * job.attempts);
        }
      }
    };

    const delay = opts?.delay ?? 0;
    setTimeout(runJob, delay);
    return job;
  }
}

export const bookingQueue = new InMemoryQueue<{
  bookingId: number;
  userId: string;
  serviceName: string;
  providerName: string;
}>();
