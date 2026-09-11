# Telegram Bot and Mini App Setup Guide

This guide describes how to configure your Telegram bot and connect the Telegram Mini App (TMA).

## 1. Create a Bot with BotFather

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and choose a name (e.g. `My LoadPulse Cloud`).
3. Choose a username ending in `bot` (e.g. `loadpulse_cloud_bot`).
4. Save the HTTP API token provided by BotFather.

## 2. Set Up the Mini App Button

To allow users to launch the LoadPulse cockpit directly from the chat header or menu:

1. In BotFather, send `/mybots` and select your bot.
2. Go to **Bot Settings** -> **Menu Button** -> **Configure Menu Button**.
3. Send the public HTTPS URL where your Mini App is accessible (e.g. your cloud domain or an ngrok/localtunnel URL during development).
4. Enter the button title: `LoadPulse`.

## 3. Configure Local Environment

In your `loadpulse-cloud` project directory:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set your bot token:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
   DEMO_MODE=false
   PORT=8080
   ```
3. Start the server:
   ```bash
   npm run start
   ```

The bot connects using Telegram's long-polling mechanism (`getUpdates`). You do not need an incoming webhook URL or SSL certificates for the bot itself.

## 4. Testing Commands

Open your bot in Telegram and try the following commands:

- `/start` to verify connectivity.
- `/bench https://httpbin.org/get 10 5s` to run a 5-second test with 10 workers.
- `/history` to list previous benchmark runs.
- `/help` to see syntax and configuration limits.
