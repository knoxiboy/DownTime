# Deployment Guide: DownTime on Vercel

Your project is structured as a monorepo (`frontend`, `backend`, `ai-service`). To successfully deploy this on Vercel, follow these steps:

## 1. Primary Deployment (Frontend)
Vercel needs to know precisely where the Next.js app is located.

1. Go to your **Vercel Dashboard**.
2. Select your `down-time` project.
3. Go to **Settings** -> **General**.
4. Find the **Root Directory** field and click **Edit**.
5. Set it to `frontend` and click **Save**.
6. **Redeploy**: Go to the "Deployments" tab, click the three dots on the latest deployment, and select "Redeploy".

## 2. API Routing
I have already added a root-level `vercel.json` that will route:
- `/api/*` requests to your NestJS backend.
- `/risk/*` requests to your FastAPI AI service.

## 3. Environment Variables
In **Settings** -> **Environment Variables**, add:
- `DATABASE_URL`: `postgresql://neondb_owner:npg_prgXBvC3e6DM@ep-gentle-resonance-amyt7r03-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require`
- `NEXT_PUBLIC_API_URL`: (Optional, can be left blank if using relative paths as configured).

## 4. Why the 404 happened?
Vercel tried to build the root of your repo, which contains no web files. By setting the **Root Directory** to `frontend`, Vercel will trigger the correct Next.js build process.
