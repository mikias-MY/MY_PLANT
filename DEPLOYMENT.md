# Deployment Guide: MY Plant on Railway.app (Monolith)

This guide explains how to deploy the "MY Plant" application to Railway.app using the simplified monolithic Docker approach.

## Prerequisites
- A [Railway.app](https://railway.app/) account.
- Your code pushed to a GitHub repository.

## Steps to Deploy

### 1. Create a New Project
- Log in to Railway.app.
- Click **+ New Project**.
- Select **Deploy from GitHub repo**.
- Choose your `MY_PLANT` repository.

### 2. Automatic Detection
Railway will detect the `Dockerfile` at the root of your repository. 
- It will automatically build the image which includes **both** the Frontend (Nginx) and the Backend (Flask/Gunicorn).
- It will expose the application on **port 80** by default.

### 3. Add Environment Variables
- If you use features like the AI Chat or TTS, go to the **Variables** tab in Railway.
- Add `NARAKEET_API_KEY` or any other necessary keys.

### 4. Verify Deployment
- Railway will provide a public HTTPS URL (e.g., `my-plant-production.up.railway.app`).
- Open this URL in your browser.
- **Camera Permissions**: Since Railway provides automatic SSL (HTTPS), your camera will work instantly!

## Why this works
- **Monolith Approach**: By putting the frontend and backend in one container, we bypass all "Build Plan" errors and complex inter-service networking.
- **Internal Proxying**: Nginx (on port 80) handles the static files and proxies `/api` calls directly to the local Flask server (on port 5000) inside the same container.
- **Production Grade**: Uses `Gunicorn` for the API and `Nginx` for the static assets, managed by `Supervisor`.
