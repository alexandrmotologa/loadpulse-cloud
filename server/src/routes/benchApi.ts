import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { benchmarkManager } from '../engine/manager';
import { historyStore } from '../storage/historyStore';
import { runPreflightProbe } from '../engine/probe';
import { BenchmarkConfig } from '../types';

const ProbeSchema = z.object({
  url: z.string().url(),
  method: z.string().optional().default('GET'),
  headers: z.record(z.string()).optional(),
});

const StartBenchSchema = z.object({
  url: z.string().url(),
  concurrency: z.number().int().min(1).max(100).default(10),
  durationSec: z.number().int().min(5).max(30).default(10),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD']).default('GET'),
  loadProfile: z.enum(['flat', 'ramp-up', 'spike', 'step']).default('flat'),
  slo: z.object({
    maxP95Ms: z.number().positive().optional(),
    maxErrorRatePercent: z.number().min(0).max(100).optional(),
    minRps: z.number().positive().optional(),
  }).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

export async function benchRoutes(fastify: FastifyInstance): Promise<void> {
  // Pre-flight diagnostic probe
  fastify.post('/api/probe', async (request, reply) => {
    const parseResult = ProbeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
    }

    try {
      const isDemo = process.env.DEMO_MODE === 'true';
      const result = await runPreflightProbe(
        parseResult.data.url,
        isDemo,
        parseResult.data.method,
        parseResult.data.headers
      );
      return reply.send(result);
    } catch (err: any) {
      const statusCode = err.name === 'SSRFValidationError' ? 403 : 400;
      return reply.status(statusCode).send({
        error: err.name || 'ProbeError',
        message: err.message,
      });
    }
  });
  // Start a new benchmark run
  fastify.post('/api/bench', async (request, reply) => {
    const parseResult = StartBenchSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
    }

    try {
      const config: BenchmarkConfig = parseResult.data;
      const job = await benchmarkManager.startBenchmark(config);

      return reply.status(201).send({
        id: job.id,
        status: 'running',
        config: job.config,
      });
    } catch (err: any) {
      const statusCode = err.name === 'SSRFValidationError' ? 403 : 400;
      return reply.status(statusCode).send({
        error: err.name || 'BenchmarkStartError',
        message: err.message,
      });
    }
  });

  // Server-Sent Events stream for live benchmark telemetry
  fastify.get('/api/bench/:id/stream', (request, reply) => {
    const { id } = request.params as { id: string };
    const job = benchmarkManager.getJob(id);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // If already finished or not in memory, check history
    if (!job) {
      const historical = historyStore.get(id);
      if (historical) {
        sendEvent('completed', historical);
        reply.raw.end();
        return;
      }
      sendEvent('error', { message: `Benchmark ${id} not found.` });
      reply.raw.end();
      return;
    }

    // Send initial status
    sendEvent('started', { id: job.id, config: job.config });
    if (job.lastTick) {
      sendEvent('tick', job.lastTick);
    }

    if (job.status === 'completed' && job.report) {
      sendEvent('completed', job.report);
      reply.raw.end();
      return;
    }

    if (job.status === 'error') {
      sendEvent('error', { message: 'Benchmark ended with error.' });
      reply.raw.end();
      return;
    }

    const onTick = (tick: any) => sendEvent('tick', tick);
    const onCompleted = (report: any) => {
      sendEvent('completed', report);
      cleanup();
      reply.raw.end();
    };
    const onError = (errData: any) => {
      sendEvent('error', errData);
      cleanup();
      reply.raw.end();
    };

    job.emitter.on('tick', onTick);
    job.emitter.on('completed', onCompleted);
    job.emitter.on('error', onError);

    const cleanup = () => {
      job.emitter.off('tick', onTick);
      job.emitter.off('completed', onCompleted);
      job.emitter.off('error', onError);
    };

    request.raw.on('close', cleanup);
  });

  // Stop active benchmark
  fastify.post('/api/bench/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = benchmarkManager.stopBenchmark(id);
    if (success) {
      return reply.send({ id, status: 'stopped' });
    }
    return reply.status(404).send({ error: `Active benchmark ${id} not found.` });
  });

  // List active benchmarks
  fastify.get('/api/bench/active', async () => {
    const jobs = benchmarkManager.getActiveJobs();
    return {
      count: jobs.length,
      jobs: jobs.map((j) => ({
        id: j.id,
        url: j.config.url,
        concurrency: j.config.concurrency,
        durationSec: j.config.durationSec,
        elapsedSec: j.lastTick?.elapsedSec || 0,
        rps: j.lastTick?.rps || 0,
      })),
    };
  });
}
