import { CommandContext, Context, Bot } from 'grammy';
import { benchmarkManager } from '../../engine/manager';
import { LiveMessageUpdater } from '../liveMessage';
import { BenchmarkConfig } from '../../types';

// Map of chatId -> active benchmark ID to prevent concurrent spam in the same chat
export const chatActiveBenchmarks = new Map<number, string>();

export async function handleBench(
  bot: Bot,
  ctx: CommandContext<Context>,
  webAppUrl?: string
): Promise<void> {
  const chatId = ctx.chat.id;
  const match = ctx.match?.trim();

  if (!match) {
    await ctx.reply(
      `⚠️ *Usage:* \`/bench <url> [concurrency] [duration]\`\n\n` +
      `*Example:*\n\`/bench https://httpbin.org/get 20 10s\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Check if a benchmark is already in flight for this chat
  const existingId = chatActiveBenchmarks.get(chatId);
  if (existingId) {
    const existingJob = benchmarkManager.getJob(existingId);
    if (existingJob && existingJob.status === 'running') {
      await ctx.reply(
        `⚠️ A benchmark is already running in this chat (\`${existingId}\`).\n` +
        `Use \`/stop\` to cancel it before starting another test.`,
        { parse_mode: 'Markdown' }
      );
      return;
    } else {
      chatActiveBenchmarks.delete(chatId);
    }
  }

  // Parse arguments
  const parts = match.split(/\s+/);
  const targetUrl = parts[0];
  let concurrency = 10;
  let durationSec = 10;

  if (parts.length > 1) {
    const parsedC = parseInt(parts[1], 10);
    if (!isNaN(parsedC)) concurrency = parsedC;
  }

  if (parts.length > 2) {
    const durRaw = parts[2].toLowerCase().replace('s', '');
    const parsedD = parseInt(durRaw, 10);
    if (!isNaN(parsedD)) durationSec = parsedD;
  }

  const config: BenchmarkConfig = {
    url: targetUrl,
    concurrency,
    durationSec,
  };

  const updater = new LiveMessageUpdater(bot, chatId, config, webAppUrl);
  await updater.init();

  try {
    const job = await benchmarkManager.startBenchmark(config);
    chatActiveBenchmarks.set(chatId, job.id);

    job.emitter.on('tick', (tick) => {
      updater.updateTick(tick);
    });

    job.emitter.on('completed', (report) => {
      chatActiveBenchmarks.delete(chatId);
      updater.complete(report);
    });

    job.emitter.on('error', (errData) => {
      chatActiveBenchmarks.delete(chatId);
      updater.fail(errData.message || 'Benchmark failed.');
    });
  } catch (err: any) {
    chatActiveBenchmarks.delete(chatId);
    await updater.fail(err.message || 'Validation error.');
  }
}
