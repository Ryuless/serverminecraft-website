# serverminecraft-website

Website komunitas + status server Minecraft berbasis React (Vite) dengan data dari Plan Plugin.

## Jalankan Lokal

```bash
npm install
npm run dev
```

Jika ingin backend realtime lokal (opsional):

```bash
npm run metrics:dev
```

## Deploy ke Vercel (Penting)

Di production, frontend tidak boleh memakai `http://localhost:9300` karena itu hanya ada di komputer lokal.

Project ini sudah menyediakan endpoint serverless:

- `/api/realtime-metrics`
- `/api/redeem-code`
- `/api/find-nickname`

Set Environment Variables di Vercel:

- `PLAN_BASE_URL` = `http://veynarsmp.my.id:25621`
- `PLAN_SERVER_UUID` = `a36977ad-71fd-4225-9cae-efcfbe82bf8d`
- `PLAN_AUTH_TOKEN` = (opsional)
- `PLAN_TIMEOUT_MS` = `5000`

Untuk redeem code (Vault/LiteEco via RCON), tambahkan juga:

- `MC_RCON_HOST` = host server Minecraft
- `MC_RCON_PORT` = `25575` (sesuaikan)
- `MC_RCON_PASSWORD` = password RCON
- `MC_RCON_TIMEOUT_MS` = `5000` (opsional)
- `REDEEM_DEFAULT_PLAYER` = username target hadiah jika frontend tidak kirim player
- `ECONOMY_PLUGIN_MODE` = `vault` atau `liteeco`
- `ECO_COMMAND_TEMPLATE` = opsional template custom command (contoh: `eco give {player} {amount}`)
- `REDEEM_CODE_REWARDS_JSON` = JSON map code -> nominal
	- contoh: `{\"GABUT500\":500,\"VEYNAR1000\":1000}`
- `ALLOW_REPEAT_REDEEM_SAME_IP` = `false` (default, IP yang sama tidak bisa redeem lagi)
- `MOJANG_LOOKUP_TIMEOUT_MS` = `5000` (timeout pengecekan nickname)

Catatan IP detector:

- API membaca IP dari `x-forwarded-for`, `x-real-ip`, lalu `remoteAddress`.
- Default: 1 IP hanya boleh redeem sekali.
- Jika ingin mengizinkan redeem ulang dari IP yang sama, set `ALLOW_REPEAT_REDEEM_SAME_IP=true`.

Frontend otomatis memakai:

- Lokal: `http://localhost:9300/api/realtime-metrics`
- Production/Vercel: `/api/realtime-metrics`
