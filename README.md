Hanya Untuk Server Pribadi Saya

## Deploy ke Vercel (Realtime Metrics)

Agar TPS, uptime, status server, dan online player terbaca setelah deploy, set Environment Variables berikut di project Vercel:

- PLAN_BASE_URL=http://veynarsmp.my.id:25911
- PLAN_SERVER_UUID=a36977ad-71fd-4225-9cae-efcfbe82bf8d
- PLAN_AUTH_TOKEN= (isi jika Plan API pakai auth)
- PLAN_TIMEOUT_MS=5000

Frontend production sudah membaca endpoint internal `/api/realtime-metrics`, jadi tidak perlu set `VITE_REALTIME_METRICS_ENDPOINT` kecuali ingin override.
