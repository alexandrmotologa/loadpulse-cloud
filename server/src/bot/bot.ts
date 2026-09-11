import { Bot } from 'grammy';
import { handleStart } from './commands/start';
import { handleHelp } from './commands/help';
import { handleBench } from './commands/bench';
import { handleHistory } from './commands/history';
import { handleStop } from './commands/stop';
import { handleProbe } from './commands/probe';

export class TelegramBotService {
  private bot: Bot | null = null;
  private token: string | undefined;
  private webAppUrl: string | undefined;
  private isRunning: boolean = false;

  constructor(token?: string, webAppUrl?: string) {
    this.token = token;
    this.webAppUrl = webAppUrl;
  }

  public async start(): Promise<void> {
    if (!this.token || this.token === 'mock_token' || this.token === 'your_bot_token_here') {
      console.log('🤖 [Telegram Bot] No valid TELEGRAM_BOT_TOKEN provided. Running bot in offline/demo mode.');
      return;
    }

    try {
      this.bot = new Bot(this.token);

      this.bot.command('start', (ctx) => handleStart(ctx, this.webAppUrl));
      this.bot.command('help', (ctx) => handleHelp(ctx));
      this.bot.command('bench', (ctx) => handleBench(this.bot!, ctx, this.webAppUrl));
      this.bot.command('probe', (ctx) => handleProbe(ctx));
      this.bot.command('history', (ctx) => handleHistory(ctx, this.webAppUrl));
      this.bot.command('stop', (ctx) => handleStop(ctx));

      this.bot.catch((err) => {
        console.error('[Telegram Bot Error]', err);
      });

      console.log('🤖 [Telegram Bot] Initializing long polling with Telegram API...');
      this.bot.start({
        onStart: (botInfo) => {
          console.log(`🤖 [Telegram Bot] Online as @${botInfo.username}`);
          this.isRunning = true;
        },
      });
    } catch (err: any) {
      console.warn('⚠️ [Telegram Bot] Could not connect to Telegram:', err.message);
    }
  }

  public async stop(): Promise<void> {
    if (this.bot && this.isRunning) {
      await this.bot.stop();
      this.isRunning = false;
      console.log('🤖 [Telegram Bot] Stopped.');
    }
  }
}
