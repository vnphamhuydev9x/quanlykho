gcloud config set project quanlykho-dev

gcloud run services update quanlykho-backend `
  --region asia-southeast1 `
  --set-env-vars "DATABASE_URL=postgresql://neondb_owner:npg_8YX3EBVsNQxf@ep-small-night-a1ik5wwh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
,REDIS_URL=rediss://default:gQAAAAAAATrjAAIncDJlNTJhM2VlOTVlZjM0NmU1OGQxNzdkODhjZjQwNDI5M3AyODA2MTE@viable-anteater-80611.upstash.io:6379,JWT_SECRET=dev-secret-not-for-prod,NODE_ENV=dev,R2_ACCOUNT_ID=77b505d4fc9616bb53d6c1ebf42abcc3,R2_ACCESS_KEY_ID=ce1e33d6ccb7b0274b4a2afdec19af6b,R2_SECRET_ACCESS_KEY=08bc9610e9535a83741fc1c1d3da98715f04c5c74f11309128fc675c071d7cb1,R2_BUCKET_NAME=quanlykho-dev,R2_PUBLIC_URL=https://pub-7312d07a0a974cf3a05c56060d6d6b80.r2.dev"
