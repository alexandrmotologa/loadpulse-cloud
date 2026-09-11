# SSRF Protection and Runtime Boundaries

LoadPulse Cloud is designed to test public HTTP services on demand. Because the tool accepts arbitrary URLs from users via Telegram and web inputs, Server-Side Request Forgery (SSRF) protection is mandatory.

## Threat Model

Without protection, an on-demand benchmarking engine running inside a user network or cloud container could be used to:
- Probe internal infrastructure (e.g. `192.168.1.1`, router admin portals, internal microservices).
- Query cloud instance metadata services (e.g. `http://169.254.169.254/latest/meta-data/`) to steal IAM roles or instance credentials.
- Target local loopback services (e.g. `http://localhost:5432`, redis, docker daemon).
- Conduct distributed denial of service against third parties using amplified concurrency.

## Defensive Controls

### 1. Protocol Whitelist
Only `http:` and `https:` schemes are accepted. Protocols such as `file:`, `ftp:`, `gopher:`, `ws:`, and `unix:` are rejected during URL parsing.

### 2. DNS-Level IP Verification
URL hostname strings alone do not guarantee safety, as domain names can point to loopback or private addresses (e.g. `spoofed.local` -> `127.0.0.1`).

Before any socket connection opens, the engine performs DNS resolution through `dns.promises.lookup` with `{ all: true }`. Every resolved IPv4 and IPv6 address is evaluated against the following blacklist:

| CIDR Range | Scope | Description |
| :--- | :--- | :--- |
| `127.0.0.0/8` | IPv4 Loopback | Prevents hitting services bound to localhost |
| `10.0.0.0/8` | IPv4 Private (RFC 1918) | Corporate and private network space |
| `172.16.0.0/12` | IPv4 Private (RFC 1918) | Docker default bridges and internal subnets |
| `192.168.0.0/16` | IPv4 Private (RFC 1918) | Home and small office LANs |
| `169.254.0.0/16` | IPv4 Link-Local | AWS, GCP, Azure, and DigitalOcean metadata APIs |
| `0.0.0.0/8` | IPv4 Broadcast/Default | Unspecified targets |
| `::1/128` | IPv6 Loopback | Prevents localhost bypass via IPv6 |
| `fc00::/7` | IPv6 Unique Local (ULA) | Private IPv6 addresses |
| `fe80::/10` | IPv6 Link-Local | Local network link traffic |

If any resolved IP address matches a blacklisted range, the benchmark aborts before making an HTTP connection.

### 3. Concurrency and Duration Ceilings
To prevent resource exhaustion:
- Virtual users are capped at 100 concurrent workers.
- Test duration is capped at 30 seconds.
- Per-request connection timeouts are fixed at 10 seconds.
- The server limits concurrent active benchmark jobs per chat/session to 1.
