import { FastifyInstance } from 'fastify';
import { historyStore } from '../storage/historyStore';
import { benchmarkManager } from '../engine/manager';

export async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  // Get report by benchmark ID
  fastify.get('/api/bench/:id/report', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Check active job first if it already has completed report
    const job = benchmarkManager.getJob(id);
    if (job && job.report) {
      return reply.send(job.report);
    }

    const report = historyStore.get(id);
    if (!report) {
      return reply.status(404).send({ error: `Report for benchmark "${id}" not found.` });
    }

    return reply.send(report);
  });

  // Get benchmark history
  fastify.get('/api/history', async (request) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const reports = historyStore.list(isNaN(limit) ? 20 : limit);
    return {
      count: reports.length,
      reports,
    };
  });

  // Clear history
  fastify.delete('/api/history', async () => {
    historyStore.clear();
    return { status: 'cleared' };
  });

  // Health check endpoint
  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'loadpulse-cloud',
      companionTo: 'https://github.com/alexandrmotologa/loadpulse',
      demoMode: process.env.DEMO_MODE === 'true',
      time: new Date().toISOString(),
    };
  });
}
