# LoadPulse Cloud

[![Companion to alexandrmotologa/loadpulse](https://img.shields.io/badge/Companion%20to-loadpulse-orange.svg)](https://github.com/alexandrmotologa/loadpulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Server-Fastify-black.svg)](https://fastify.dev/)
[![Telegram Mini App](https://img.shields.io/badge/Telegram-Mini%20App-2CA5E0.svg)](https://core.telegram.org/bots/webapps)

LoadPulse Cloud is the official Telegram companion and mobile control station for [alexandrmotologa/loadpulse](https://github.com/alexandrmotologa/loadpulse). It allows engineers to trigger on-demand HTTP benchmarks, track throughput live in chat, and inspect high dynamic range latency percentiles through an embedded Telegram Mini App.

```
                  +----------------------------------------------+
                  |         Telegram Chat & Mini App (TMA)       |
                  +----------------------------------------------+
                                |                    ^
                    /bench URL  |                    | SSE Stream &
                    [c] [d]     v                    | Throttled Edits
                  +----------------------------------------------+
                  |           LoadPulse Cloud Server             |
                  |                                              |
                  |  +----------------+      +----------------+  |
                  |  |  grammY Bot    |      | Fastify + SSE  |  |
                  |  |  Long Polling  |      | HTTP API       |  |
                  |  +----------------+      +----------------+  |
                  |           |                      |           |
                  |           v                      v           |
                  |  +----------------------------------------+  |
                  |  |       Benchmark Dispatcher & Guard     |  |
                  |  |  - SSRF Resolver & IP Blocklist Filter |  |
                  |  |  - Concurrency Limiter (1 - 100 VUs)   |  |
                  |  |  - Duration Cap (5s - 30s)             |  |
                  |  +----------------------------------------+  |
                  +----------------------------------------------+
                                |                    |
         (DEMO_MODE=true)       v                    v  (Live Mode)
                  +-------------------+        +--------------------+
                  | Mock Load Engine  |        | Undici Pool Engine |
                  | Synthetic Spikes  |        | Keep-Alive Workers |
                  | Bell Latency Dist |        | hdr-histogram-js   |
                  +-------------------+        +--------------------+
                                                         |
                                                         v
                                               +--------------------+
                                               | Target HTTP API    |
                                               +--------------------+
```

## Highlights

- **Telegram Bot Control:** Trigger tests with `/bench <url> [concurrency] [duration]` and watch live status edits throttled at 1.5-second intervals.
- **Telegram Mini App Cockpit:** Launch an interactive mobile dashboard with an SVG throughput gauge, streaming latency charts, and percentile curves.
- **High Dynamic Range Percentiles:** Calculates exact p50, p75, p90, p95, p99, and p99.9 latencies with `hdr-histogram-js`.
- **SSRF and Abuse Prevention:** Blocks private IP ranges (RFC 1918, RFC 4193, loopback, link-local, cloud metadata) at DNS resolution time.
- **Zero-Domain Architecture:** Runs locally on Telegram long polling without public HTTPS webhooks or external domains.
- **Built-in Demo Mode:** Ships with `DEMO_MODE=true` to generate realistic synthetic benchmark runs without sending outbound HTTP packets.

## System Architecture

LoadPulse Cloud divides duties across two subprojects:

1. **`server/`:** Node.js, TypeScript, and Fastify. Manages the grammY bot instance, SSRF safety guards, Undici connection pools, histogram calculations, and Server-Sent Events (SSE) telemetry.
2. **`web/`:** React 19, TypeScript, Vite, Tailwind CSS, and Lucide Icons. Provides the touch-friendly Mini App interface with responsive gauges, percentile curves, and benchmark configuration.

## Telegram Bot Commands

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/start` | None | Welcomes the user, explains usage, and provides quick test shortcuts. |
| `/bench` | `<url> [concurrency] [duration]` | Starts an on-demand benchmark (e.g. `/bench https://httpbin.org/get 25 10s`). |
| `/history` | None | Lists recent benchmark runs with one-click report view buttons. |
| `/stop` | None | Cancels the currently active benchmark in the chat. |
| `/help` | None | Displays syntax examples, safety parameters, and configuration guidelines. |

## Quickstart

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- (Optional) Docker and Docker Compose

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/alexandrmotologa/loadpulse-cloud.git
cd loadpulse-cloud

# Install root dependencies
npm install

# Install server and web dependencies
npm run install:all
```

### 2. Configure Environment

Copy the example file:

```bash
cp .env.example .env
```

If you have a bot token from [@BotFather](https://t.me/BotFather), paste it into `.env`. If you want to test the server and UI without a bot token, keep `DEMO_MODE=true`.

### 3. Run Locally

To run the backend server and Mini App dev server simultaneously:

```bash
npm run dev
```

The Fastify server starts on `http://localhost:8080` and the Vite development server starts on `http://localhost:5173`.

### 4. Run via Docker

```bash
docker compose up --build
```

The container packages the compiled React app and the Node.js Fastify server into a single container on port 8080.

## Benchmark Execution Details

### Safety Limits

To prevent denial-of-service accidents, the engine enforces strict runtime ceilings:
- Maximum concurrency: 100 virtual users
- Maximum duration: 30 seconds
- Connection timeout: 10 seconds
- Allowed protocols: `http:` and `https:` only

### SSRF Filter

Before issuing network requests, the engine resolves target hostnames using Node.js `dns.promises.lookup` and verifies that all resolved IP addresses sit outside the following ranges:
- `127.0.0.0/8` (Loopback)
- `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Private networks)
- `169.254.0.0/16` (Link-local and cloud metadata services)
- `::1` and `fc00::/7` (IPv6 loopback and unique local addresses)

Any test targeting private infrastructure terminates immediately with an explanatory error.

## Companion Repository

LoadPulse Cloud is designed to accompany [alexandrmotologa/loadpulse](https://github.com/alexandrmotologa/loadpulse), a standalone benchmarking engine. While the core LoadPulse repository provides CLI and raw engine primitives, LoadPulse Cloud brings that workflow to mobile devices, team chats, and automated alerting channels.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
