import { CommandContext, Context } from 'grammy';

export async function handleHelp(ctx: CommandContext<Context>): Promise<void> {
  const helpText =
    `📖 *LoadPulse Cloud Documentation*\n\n` +
    `*Command Syntax:*\n` +
    `\`/bench <url> [concurrency] [duration]\`\n\n` +
    `*Parameters:*\n` +
    `• \`url\`: Target HTTP/HTTPS address (e.g. \`https://httpbin.org/get\`)\n` +
    `• \`concurrency\`: Number of parallel virtual users (1 to 100, default: 10)\n` +
    `• \`duration\`: Benchmark length in seconds (5s to 30s, default: 10s)\n\n` +
    `*Examples:*\n` +
    `• \`/bench https://httpbin.org/get\` (10 workers, 10 seconds)\n` +
    `• \`/bench https://httpbin.org/get 25 15s\` (25 workers, 15 seconds)\n` +
    `• \`/bench https://httpbin.org/delay/1 5 10s\`\n\n` +
    `*Safety Limits & SSRF Protection:*\n` +
    `Private IP subnets (10.x, 172.16-31.x, 192.168.x), localhost, and cloud metadata (169.254.169.254) are strictly blocked.\n\n` +
    `*Companion Project:*\n` +
    `Check out the high-performance CLI engine at [alexandrmotologa/loadpulse](https://github.com/alexandrmotologa/loadpulse).`;

  await ctx.reply(helpText, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
  });
}
