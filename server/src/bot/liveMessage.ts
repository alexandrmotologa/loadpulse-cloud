import { Bot, InlineKeyboard } from 'grammy';
import { BenchmarkConfig, BenchmarkReport, BenchmarkTick } from '../types';

export class LiveMessageUpdater {
  private bot: Bot;
  private chatId: number;
  private messageId: number | null = null;
  private lastEditTime: number = 0;
  private pendingText: string | null = null;
  private editTimer: NodeJS.Timeout | null = null;
  private readonly throttleMs: number = 1500;
  private config: BenchmarkConfig;
  private webAppUrl?: string;

  constructor(bot: Bot, chatId: number, config: BenchmarkConfig, webAppUrl?: string) {
    this.bot = bot;
    this.chatId = chatId;
    this.config = config;
    this.webAppUrl = webAppUrl;
  }

  public async init(): Promise<void> {
    const initialText = this.formatInitialText();
    try {
      const msg = await this.bot.api.sendMessage(this.chatId, initialText, {
        parse_mode: 'Markdown',
      });
      this.messageId = msg.message_id;
      this.lastEditTime = Date.now();
    } catch (err) {
      console.error('[LiveMessageUpdater] Failed to send initial message:', err);
    }
  }

  public updateTick(tick: BenchmarkTick): void {
    if (!this.messageId) return;

    const progressRatio = Math.min(1, tick.elapsedSec / this.config.durationSec);
    const progressBar = this.renderProgressBar(progressRatio);
    const progressPercent = Math.round(progressRatio * 100);

    const text =
      `🚀 *LoadPulse Benchmark in progress...*\n` +
      `🎯 *Target:* \`${this.config.url}\`\n` +
      `⚙️ *Workers:* ${this.config.concurrency} | *Duration:* ${this.config.durationSec}s\n\n` +
      `📈 *Progress:* \`${progressBar}\` ${progressPercent}% (${tick.elapsedSec.toFixed(1)}s)\n` +
      `⚡ *Throughput:* ${tick.rps.toLocaleString()} req/s | *Total:* ${tick.totalRequests.toLocaleString()} reqs\n` +
      `⏱️ *Latency:* p50: \`${tick.currentP50}ms\` | p95: \`${tick.currentP95}ms\` | p99: \`${tick.currentP99}ms\``;

    this.scheduleEdit(text);
  }

  public async complete(report: BenchmarkReport): Promise<void> {
    if (this.editTimer) {
      clearTimeout(this.editTimer);
      this.editTimer = null;
    }

    if (!this.messageId) return;

    const text =
      `✅ *LoadPulse Benchmark Complete!*\n\n` +
      `🎯 *Target:* \`${report.url}\`\n` +
      `⚙️ *Workers:* ${report.concurrency} | *Actual Duration:* ${(report.durationActualMs / 1000).toFixed(1)}s\n` +
      `📦 *Total Requests:* ${report.totalRequests.toLocaleString()} (${report.failedRequests > 0 ? `⚠️ ${report.failedRequests} errors` : '100% OK'})\n` +
      `⚡ *Throughput:* Mean: \`${report.rpsMean} req/s\` | Peak: \`${report.rpsPeak} req/s\`\n\n` +
      `📊 *Latency Percentiles:*\n` +
      `  • p50: \`${report.latencies.p50}ms\`\n` +
      `  • p75: \`${report.latencies.p75}ms\`\n` +
      `  • p90: \`${report.latencies.p90}ms\`\n` +
      `  • p95: \`${report.latencies.p95}ms\`\n` +
      `  • p99: \`${report.latencies.p99}ms\`\n` +
      `  • p99.9: \`${report.latencies.p99_9}ms\`\n` +
      `  • Min/Max: \`${report.latencies.min}ms\` / \`${report.latencies.max}ms\`\n\n` +
      `🔗 _Companion to [alexandrmotologa/loadpulse](https://github.com/alexandrmotologa/loadpulse)_`;

    const keyboard = new InlineKeyboard();
    if (this.webAppUrl) {
      const appUrlWithBench = `${this.webAppUrl}?benchId=${report.id}`;
      keyboard.webApp('📊 Open Full Interactive Report', appUrlWithBench);
    }

    try {
      await this.bot.api.editMessageText(this.chatId, this.messageId, text, {
        parse_mode: 'Markdown',
        reply_markup: this.webAppUrl ? keyboard : undefined,
        link_preview_options: { is_disabled: true },
      });
    } catch (err) {
      console.warn('[LiveMessageUpdater] Failed to send final message edit:', err);
    }
  }

  public async fail(errorMessage: string): Promise<void> {
    if (this.editTimer) {
      clearTimeout(this.editTimer);
      this.editTimer = null;
    }

    if (!this.messageId) return;

    const text =
      `❌ *LoadPulse Benchmark Terminated*\n\n` +
      `🎯 *Target:* \`${this.config.url}\`\n` +
      `⚠️ *Reason:* ${errorMessage}`;

    try {
      await this.bot.api.editMessageText(this.chatId, this.messageId, text, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.warn('[LiveMessageUpdater] Failed to edit error message:', err);
    }
  }

  private scheduleEdit(text: string): void {
    this.pendingText = text;
    const now = Date.now();
    const elapsedSinceLastEdit = now - this.lastEditTime;

    if (elapsedSinceLastEdit >= this.throttleMs) {
      this.flushEdit();
    } else if (!this.editTimer) {
      this.editTimer = setTimeout(() => {
        this.flushEdit();
      }, this.throttleMs - elapsedSinceLastEdit);
    }
  }

  private async flushEdit(): Promise<void> {
    if (this.editTimer) {
      clearTimeout(this.editTimer);
      this.editTimer = null;
    }

    if (!this.pendingText || !this.messageId) return;

    const text = this.pendingText;
    this.pendingText = null;
    this.lastEditTime = Date.now();

    try {
      await this.bot.api.editMessageText(this.chatId, this.messageId, text, {
        parse_mode: 'Markdown',
      });
    } catch (err: any) {
      // Ignore Telegram error if message was not modified
      if (!err.message?.includes('message is not modified')) {
        console.warn('[LiveMessageUpdater] Failed to edit message:', err.message);
      }
    }
  }

  private formatInitialText(): string {
    return (
      `🚀 *Starting LoadPulse Benchmark...*\n` +
      `🎯 *Target:* \`${this.config.url}\`\n` +
      `⚙️ *Workers:* ${this.config.concurrency} | *Duration:* ${this.config.durationSec}s\n` +
      `⏳ Initializing connection pool...`
    );
  }

  private renderProgressBar(ratio: number): string {
    const totalBars = 10;
    const filled = Math.min(totalBars, Math.max(0, Math.round(ratio * totalBars)));
    const empty = totalBars - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
