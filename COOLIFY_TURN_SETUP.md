# FibroChat Alpha 7.3 — TURN in Coolify

## 1. DNS
Create an A record, for example `turn.example.com`, pointing to the public IPv4 address of the server.

## 2. Coturn resource
Create a Docker Compose resource in Coolify from `docker-compose.turn.yml`.
Set these environment variables on the Coturn resource:

- `TURN_REALM=turn.example.com`
- `TURN_PUBLIC_IP=<public server IPv4>`
- `TURN_SHARED_SECRET=<long random secret>`

The Coturn container uses host networking because TURN needs UDP/TCP ports outside the normal HTTP reverse proxy.

## 3. Firewall / provider security group
Open inbound ports:

- TCP 3478
- UDP 3478
- UDP 49160-49200

## 4. FibroChat environment variables
Set these on the FibroChat application resource:

- `TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp`
- `TURN_SHARED_SECRET=<the same secret as Coturn>`
- `TURN_REALM=turn.example.com`
- `TURN_TTL_SECONDS=3600`

Do not set `TURN_USERNAME` and `TURN_CREDENTIAL` when using the shared-secret mode. FibroChat generates temporary credentials for each signed-in user.

## 5. Redeploy
Redeploy Coturn first, then FibroChat without build cache. Test from two different networks, for example Wi-Fi and mobile data.

## Important
A Coolify HTTP domain/proxy alone is not enough for TURN. The listed UDP/TCP ports must reach the server directly.
