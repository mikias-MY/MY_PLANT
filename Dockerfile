# --- Stage 1: Build/Prepare Frontend ---
FROM nginx:alpine as frontend-stage
# Use the comprehensive frontend directory
COPY frontend /usr/share/nginx/html

# --- Stage 2: Final Monolithic Image ---
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install backend requirements
COPY MY_PLANT_LLM/MY_PLANT/backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source code
COPY MY_PLANT_LLM/MY_PLANT/backend /app/backend

# Copy frontend from stage 1
COPY --from=frontend-stage /usr/share/nginx/html /usr/share/nginx/html

# Copy configurations
COPY nginx_prod.conf /etc/nginx/conf.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Healthcheck to help Railway monitor readiness
# Pings the Nginx proxy which in turn pings the Flask backend
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Expose port 80
EXPOSE 80

# Run supervisor to manage both Gunicorn and Nginx
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
