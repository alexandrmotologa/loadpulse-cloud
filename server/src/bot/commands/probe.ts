import { CommandContext, Context } from 'grammy';
import { runPreflightProbe } from '../../engine/probe';

export async function handleProbe(ctx: CommandContext<Context>): Promise<void> {
  const match = ctx.match?.trim();

  if (!match) {
    await ctx.reply(
      `⚠️ *Usage:* \`/probe <url>\`\n\n*Example:*\n\`/probe https://httpbin.org/get\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const initialMsg = await ctx.reply(`🔍 Probing endpoint \`${match}\`...`, {
    parse_mode: 'Markdown',
  });

  const isDemo = process.env.DEMO_MODE === 'true';

  try {
    const res = await runPreflightProbe(match, isDemo);

    const report =
      `🔍 *LoadPulse Target Diagnostic*\n\n` +
      `🎯 *Target:* \`${res.url}\`\n` +
      `📡 *Status:* \`${res.statusCode} ${res.statusText}\`\n` +
      `🌐 *Resolved IP:* \`${res.ip || 'N/A'}\`\n` +
      `🖥️ *Server:* \`${res.serverHeader || 'unknown'}\`\n\n` +
      `⏱️ *Latency Waterfall:*\n` +
      `  • DNS Lookup: \`${res.dnsMs}ms\`\n` +
      `  • TLS Handshake: \`${res.tlsMs}ms\`\n` +
      `  • TTFB: \`${res.ttfbMs}ms\`\n` +
      `  • Total Roundtrip: \`${res.totalMs}ms\`\n\n` +
      `✅ *Endpoint is responsive and ready for benchmarking.*`;

    await ctx.api.editMessageText(ctx.chat.id, initialMsg.message_id, report, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
  } catch (err: any) {
    await ctx.api.editMessageText(
      ctx.chat.id,
      initialMsg.message_id,
      `❌ *Diagnostic Probe Failed:*\n\n${err.message}`,
      { parse_mode: 'Markdown' }
    );
  }
}
