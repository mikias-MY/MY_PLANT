# Deployment Guide: MY Plant on Render.com

Since Railway is having trouble, we are switching to **Render.com**, a robust platform for Docker deployments.

## Prerequisites
- A [Render.com](https://render.com/) account.
- Your code pushed to a GitHub repository.

## Steps to Deploy

### 1. Create a New Web Service
- Log in to Render.com.
- Click **+ New** -> **Web Service**.
- Select your `MY_PLANT` repository from GitHub.

### 2. Configure Build & Runtime
Render should auto-detect your Dockerfile. 
- **Runtime**: Select **Docker**.
- **Instance Type**: Select **Free** (or "Starter" if the model needs more than 512MB RAM).
- **Environment Variables**:
    - Add `NARAKEET_API_KEY` (Optional).
    - Already set in container: `MEDIAPIPE_DISABLE_GPU=1`.

### 3. Verify Deployment
- Render will start the build. It usually takes 2-4 minutes for ML models.
- Once finished, you will see a public URL like `https://my-plant.onrender.com`.
- Since Render provides automatic SSL (HTTPS), your **Camera Permissions** will work by default!

## Why this works
- **Render's Native Docker Engine**: Render has a more predictable Docker environment than Railway's Railpack.
- **Monolith Container**: Everything (UI + API) runs in one service, giving you a single URL.
- **GPU Bypass**: We've disabled MediaPipe's GPU initialization to ensure it runs correctly on cloud CPUs.
