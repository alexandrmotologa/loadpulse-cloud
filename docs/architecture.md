# Architecture

LoadPulse Cloud coordinates load generation, live metric aggregation, and interactive presentation across Telegram and browser environments.

## Component Overview

The system consists of three functional layers:

1. **Telegram Ingestion Layer (grammY):** Receives user commands via Telegram Long Polling (`getUpdates`). Parses target URLs, concurrency parameters, and duration limits. It owns the lifecycle of chat status messages, editing them at 1.5-second throttled intervals to respect Telegram rate limits.
2. **Execution and Aggregation Core (Engine):** Manages concurrent workers using `undici` connection pools. Computes sliding-window throughput and records latencies directly into an HDR histogram data structure. In `DEMO_MODE=true`, a synthetic generator produces equivalent statistical distributions without outbound requests.
3. **Delivery and Presentation Layer (Fastify + Vite TMA):** Fastify serves both the REST API and Server-Sent Events (SSE) stream on port 8080. The embedded React Mini App connects to the SSE stream to render real-time SVG throughput gauges, latency percentile curves, and status code distributions.

```
+-----------------------------------------------------------------------------------+
|                                Telegram Client                                    |
|                                                                                   |
|  [ Chat Messages ]                                   [ Telegram Mini App (TMA) ]  |
|  - Throttled text updates (1.5s)                     - React 19 + Tailwind CSS   |
|  - Final markdown summary card                       - SVG RPS Speedometer Gauge  |
|  - Inline WebApp launch button                       - Interactive Percentiles    |
+-----------------------------------------------------------------------------------+
        ^                                                       ^
        |                                                       |
        | Long Polling (getUpdates)                             | HTTP & SSE Stream
        v                                                       v
+-----------------------------------------------------------------------------------+
|                             LoadPulse Cloud Server                                |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |   grammY Bot       |   |  Fastify Web Server   |   |   History Store        |  |
|  |   Command Dispatch |   |  REST & SSE Streaming |   |   In-Memory / File DB  |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|            |                         |                                            |
|            +------------+------------+                                            |
|                         |                                                         |
|                         v                                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                            Benchmark Manager                                |  |
|  |  - SSRF DNS Validation (rejects loopback, private RFC1918, metadata IPs)    |  |
|  |  - Concurrency controller (1 to 100 virtual users)                          |  |
|  |  - High Dynamic Range Histogram (1ms to 60,000ms, 3 sig figs)               |  |
|  +-----------------------------------------------------------------------------+  |
|            |                                                 |                    |
|            | (Live Mode)                                     | (DEMO_MODE=true)   |
|            v                                                 v                    |
|  +-----------------------+                         +-----------------------+      |
|  |  Undici Worker Pool   |                         |  Mock Load Engine     |      |
|  |  HTTP keep-alive      |                         |  Bell curve synthetic |      |
|  +-----------------------+                         +-----------------------+      |
+-----------------------------------------------------------------------------------+
```

## Data Flow

### 1. Benchmark Initialization
When a user types `/bench https://httpbin.org/get 20 10s` in Telegram or taps "Start Stress Test" inside the Mini App:
- The input string is validated against schema constraints (URL syntax, max concurrency <= 100, max duration <= 30s).
- The SSRF guard resolves the host through DNS and checks every IP against the forbidden subnets list.
- A unique benchmark ID (`bench_xxx`) is generated and registered in the in-memory benchmark manager.
- The user receives an initial message: "🚀 LoadPulse Benchmark in progress...".

### 2. Live Telemetry Pipeline
During the execution window:
- Worker threads send requests concurrently using persistent connections.
- Each completed request returns its response duration in microseconds and its HTTP status code.
- Latencies are recorded into an instance of `hdr-histogram-js`.
- A background ticker fires every 250 milliseconds:
  - Calculates current requests per second (RPS) within the sliding window.
  - Broadcasts an SSE payload to any connected Mini App clients (`event: tick`).
  - Updates the throttled message buffer for Telegram chat.
- Every 1,500 milliseconds, if the chat buffer has changed, the Telegram message is edited in place.

### 3. Finalization and Persistence
When the duration expires:
- Workers cease sending new requests and wait for pending responses to settle.
- Final percentiles (p50, p75, p90, p95, p99, p99.9), error counts, and status code totals are finalized.
- The summary report is saved to the local history store.
- The Telegram message is edited to show final stats and an inline button: `[ 📊 Open Full Interactive Report ]`.
- Mini App clients receive a final `event: done` SSE message containing the complete report payload.
