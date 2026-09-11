import { CommandContext, Context, InlineKeyboard } from 'grammy';
import { historyStore } from '../../storage/historyStore';

export async function handleHistory(
  ctx: CommandContext<Context>,
  webAppUrl?: string
): Promise<void> {
  const reports = historyStore.list(5);

  if (reports.length === 0) {
    await ctx.reply(
      `📋 *No benchmark history found yet.*\n\nRun your first benchmark with:\n\`/bench https://httpbin.org/get 10 10s\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  let text = `📜 *Recent Benchmarks:*\n\n`;
  const keyboard = new InlineKeyboard();

  reports.forEach((r, idx) => {
    const timeStr = new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    text +=
      `*${idx + 1}.* \`${r.url}\`\n` +
      `   • Workers: ${r.concurrency} | RPS: \`${r.rpsMean}\` | p95: \`${r.latencies.p95}ms\`\n` +
      `   • Time: ${timeStr} | Requests: ${r.totalRequests.toLocaleString()}\n\n`;

    if (webAppUrl && idx < 3) {
      keyboard.webApp(`📊 Report #${idx + 1}`, `${webAppUrl}?benchId=${r.id}`).row();
    }
  });

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: webAppUrl ? keyboard : undefined,
    link_preview_options: { is_disabled: true },
  });
}
