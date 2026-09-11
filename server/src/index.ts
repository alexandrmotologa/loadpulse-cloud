import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { benchRoutes } from './routes/benchApi';
import { reportRoutes } from './routes/reportApi';
import { TelegramBotService } from './bot/bot';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const port = parseInt(process.env.PORT || '8080', 10);
const host = '0.0.0.0';
const isDemoMode = process.env.DEMO_MODE === 'true';

const app = fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function main() {
  // CORS setup
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Register API routes
  await app.register(benchRoutes);
  await app.register(reportRoutes);

  // Serve static web build if present
  const clientDistPath = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(clientDistPath)) {
    console.log(`📦 [Fastify] Serving static Mini App assets from ${clientDistPath}`);
    await app.register(fastifyStatic, {
      root: clientDistPath,
      prefix: '/',
    });

    // SPA fallback
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  // Start Fastify server
  try {
    await app.listen({ port, host });
    console.log(`\n======================================================`);
    console.log(`🚀 LoadPulse Cloud Server running at http://${host}:${port}`);
    console.log(`⚡ Mode: ${isDemoMode ? 'DEMO MODE (Synthetic Load)' : 'LIVE MODE (Real HTTP)'}`);
    console.log(`🔗 Companion to: https://github.com/alexandrmotologa/loadpulse`);
    console.log(`======================================================\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Start Telegram Bot
  const botService = new TelegramBotService(
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.WEB_APP_URL
  );
  await botService.start();

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    await botService.stop();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
