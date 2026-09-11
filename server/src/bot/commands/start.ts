import { CommandContext, Context, InlineKeyboard } from 'grammy';

export async function handleStart(ctx: CommandContext<Context>, webAppUrl?: string): Promise<void> {
  const keyboard = new InlineKeyboard();
  if (webAppUrl) {
    keyboard.webApp('🚀 Open LoadPulse Cockpit', webAppUrl);
  }

  const welcomeText =
    `⚡ *Welcome to LoadPulse Cloud!*\n\n` +
    `LoadPulse Cloud is the on-demand HTTP benchmarking station and official companion to [alexandrmotologa/loadpulse](https://github.com/alexandrmotologa/loadpulse).\n\n` +
    `*Quick Commands:*\n` +
    `• \`/bench <url> [concurrency] [duration]\` — Run stress test\n` +
    `• \`/history\` — View previous benchmarks\n` +
    `• \`/stop\` — Abort ongoing test\n` +
    `• \`/help\` — View syntax and safety documentation\n\n` +
    `*Try this example:*\n` +
    `\`/bench https://httpbin.org/get 20 10s\``;

  await ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: webAppUrl ? keyboard : undefined,
    link_preview_options: { is_disabled: true },
  });
}
