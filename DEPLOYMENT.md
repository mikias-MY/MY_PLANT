# Deployment Guide: MY Plant on Railway.app

This guide explains how to deploy the "MY Plant" application to Railway.app using the provided Docker configuration.

## Prerequisites
- A [Railway.app](https://railway.app/) account.
- Your code pushed to a GitHub repository.

## Steps to Deploy

### 1. Create a New Project
- Log in to Railway.app.
- Click **+ New Project**.
- Select **Deploy from GitHub repo**.
- Choose your `MY_PLANT` repository.

### 2. Configure Services
Railway will detect the `docker-compose.yml` file and automatically create two services: `backend` and `frontend`.

#### Backend Service
- Go to the **backend** service settings.
- Under **Variables**, add any necessary environment variables (e.g., `NARAKEET_API_KEY` if you have one).
- Railway will automatically build the image using the `Dockerfile` in `./MY_PLANT_LLM/MY_PLANT/backend`.

#### Frontend Service
- Go to the **frontend** service settings.
- Railway will build the image using the `Dockerfile` in `./frontend`.
- Click on the **Networking** tab and click **Generate Domain** to get a public URL for your frontend.
- **IMPORTANT**: Ensure the frontend service is exposed on port 80 (standard for HTTP).

### 3. Verify Deployment
- Once the deployment is complete, visit the generated URL for the frontend.
- Since Railway provides HTTPS automatically, your camera permissions should work out of the box!
- The frontend will automatically proxy `/api` requests to the `backend` service.

## Why this works
- **Nginx Reverse Proxy**: The frontend container uses Nginx to serve static files and proxy API calls. This avoids CORS issues because the browser sees everything coming from the same domain.
- **Docker Compose**: Railway uses your `docker-compose.yml` to understand the relationship between your services.
- **HTTPS**: Railway handles SSL termination, providing the secure context required for WebRTC (camera access).
