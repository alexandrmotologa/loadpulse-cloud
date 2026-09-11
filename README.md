<p align="center">
  <img src="docs/images/logo.png?raw=true" alt="LoadPulse Cloud Logo" width="130" style="border-radius: 28px;" />
</p>

<h1 align="center">LoadPulse Cloud</h1>

<p align="center">
  <strong>The Telegram Companion & Mobile Cockpit for Instant Load Testing</strong><br />
  Official cloud & mobile control station for <a href="https://github.com/alexandrmotologa/loadpulse">alexandrmotologa/loadpulse</a>
</p>

<p align="center">
  <a href="https://github.com/alexandrmotologa/loadpulse"><img src="https://img.shields.io/badge/Companion%20to-loadpulse-orange.svg" alt="Companion to loadpulse" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v20%2B-green.svg" alt="Node.js" /></a>
  <a href="https://fastify.dev/"><img src="https://img.shields.io/badge/Server-Fastify-black.svg" alt="Fastify" /></a>
  <a href="https://core.telegram.org/bots/webapps"><img src="https://img.shields.io/badge/Telegram-Mini%20App-2CA5E0.svg" alt="Telegram Mini App" /></a>
</p>

LoadPulse Cloud is the official Telegram companion and mobile control station for [alexandrmotologa/loadpulse](https://github.com/alexandrmotologa/loadpulse). It allows engineers to trigger on-demand HTTP benchmarks, track throughput live in chat, and inspect high dynamic range latency percentiles through an embedded Telegram Mini App.

## Visual Tour & Telegram Cockpit

LoadPulse Cloud brings high-fidelity load testing directly into Telegram chat and webview interfaces.

### Live Telemetry Streaming Cockpit
Real-time SVG Speedometer, dynamic worker gauge, and sub-second latency percentiles streamed over Server-Sent Events (SSE).

<p align="center">
  <img src="docs/images/cockpit_streaming.png?raw=true" alt="Live Cockpit Streaming View" width="100%" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

### Traffic Profile Configurator & Pre-flight Diagnostics
Configure Constant (Flat), Ramp-Up, Spike Burst, and Step Tiers traffic profiles with configurable concurrency and SLO quality criteria. Run single-click diagnostic probes to inspect DNS, TLS, and TTFB network latency waterfalls before stressing production endpoints.

<p align="center">
  <img src="docs/images/configurator_view.png?raw=true" alt="Benchmark Configurator View" width="49%" style="border-radius: 10px; border: 1px solid #1e293b;" />
  <img src="docs/images/preflight_probe.png?raw=true" alt="Target Pre-Flight Probe Modal" width="49%" style="border-radius: 10px; border: 1px solid #1e293b;" />
</p>

### A/B Benchmark Regression Diff & Mobile Telegram Experience
Select any two historical runs to calculate performance regressions and throughput variances. Inspect high-dynamic-range percentile curves directly within the native Telegram mobile client.

<p align="center">
  <img src="docs/images/benchmark_diff.png?raw=true" alt="A/B Benchmark Regression Diff Modal" width="56%" style="border-radius: 10px; border: 1px solid #1e293b;" />
  <img src="docs/images/telegram_mobile_cockpit.png?raw=true" alt="Telegram Mobile Cockpit View" width="41%" style="border-radius: 10px; border: 1px solid #1e293b;" />
</p>


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

- **Telegram Bot Control:** Trigger tests with `/bench <url> [concurrency] [duration]` and watch live status edits throttled at 1.5-second intervals. Run pre-flight health diagnostics with `/probe <url>`.
- **Advanced Load Traffic Profiles:** Choose between Constant (Flat), Ramp-Up (gradual virtual user scaling), Spike Burst (shockwave traffic testing), and Step Tiers (multi-stage load).
- **SLO Quality Gates:** Enforce performance criteria (max p95 latency, max error rate, min throughput) with automated `PASSED` or `BREACHED` certifications in Telegram and reports.
- **Pre-flight Diagnostic Probe:** Measure DNS lookup, TLS handshake, and Time to First Byte (TTFB) before launching high-concurrency benchmarks.
- **Telegram Mini App Cockpit:** Launch an interactive mobile dashboard with an SVG throughput gauge, real-time streaming time-series chart, and percentile curves.
- **A/B Benchmark Regression Diff:** Select any two historical benchmarks to compute percentage variances and generate GitHub PR-ready Markdown comparison tables.
- **High Dynamic Range Percentiles:** Calculates exact p50, p75, p90, p95, p99, and p99.9 latencies with `hdr-histogram-js`.
- **SSRF and Abuse Prevention:** Blocks private IP ranges (RFC 1918, RFC 4193, loopback, link-local, cloud metadata) at DNS resolution time.
- **Zero-Domain Architecture:** Runs locally on Telegram long polling without public HTTPS webhooks or external domains.
- **Built-in Demo Mode:** Ships with `DEMO_MODE=true` to generate realistic synthetic benchmark runs without sending outbound HTTP packets.

## System Architecture

LoadPulse Cloud divides duties across two subprojects:

1. **`server/`:** Node.js, TypeScript, and Fastify. Manages the grammY bot instance, pre-flight probe, SSRF safety guards, Undici connection pools, histogram calculations, and Server-Sent Events (SSE) telemetry.
2. **`web/`:** React, TypeScript, Vite, Tailwind CSS, and Lucide Icons. Provides the touch-friendly Mini App interface with responsive gauges, live streaming charts, A/B diff modals, and benchmark configuration.

## Telegram Bot Commands

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/start` | None | Welcomes the user, explains usage, and provides quick test shortcuts. |
| `/bench` | `<url> [concurrency] [duration]` | Starts an on-demand benchmark (e.g. `/bench https://httpbin.org/get 25 10s`). |
| `/probe` | `<url>` | Runs a single lightweight diagnostic check measuring DNS, TLS, and TTFB. |
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
