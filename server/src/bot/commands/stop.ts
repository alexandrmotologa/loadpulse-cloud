import { CommandContext, Context } from 'grammy';
import { benchmarkManager } from '../../engine/manager';
import { chatActiveBenchmarks } from './bench';

export async function handleStop(ctx: CommandContext<Context>): Promise<void> {
  const chatId = ctx.chat.id;
  const activeId = chatActiveBenchmarks.get(chatId);

  if (!activeId) {
    await ctx.reply(`ℹ️ No active benchmark running in this chat.`);
    return;
  }

  const stopped = benchmarkManager.stopBenchmark(activeId);
  chatActiveBenchmarks.delete(chatId);

  if (stopped) {
    await ctx.reply(`🛑 Benchmark \`${activeId}\` has been aborted.`, {
      parse_mode: 'Markdown',
    });
  } else {
    await ctx.reply(`ℹ️ Benchmark was already completed or terminated.`);
  }
}
