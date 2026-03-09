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

Set Environment Variables di Vercel:

- `PLAN_BASE_URL` = `http://veynarsmp.my.id:25621`
- `PLAN_SERVER_UUID` = `a36977ad-71fd-4225-9cae-efcfbe82bf8d`
- `PLAN_AUTH_TOKEN` = (opsional)
- `PLAN_TIMEOUT_MS` = `5000`

Frontend otomatis memakai:

- Lokal: `http://localhost:9300/api/realtime-metrics`
- Production/Vercel: `/api/realtime-metrics`
