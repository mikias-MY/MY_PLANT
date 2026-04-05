# --- Stage 1: Build/Prepare Frontend ---
FROM nginx:alpine AS frontend-stage
COPY MY_PLANT_LLM/MY_PLANT/frontend/www /usr/share/nginx/html

# --- Stage 2: Final Monolithic Image ---
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    libgl1 \
    libglib2.0-0 \
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

# Copy Nginx config to conf.d (works on both Debian nginx and slim variants)
COPY nginx_prod.conf /etc/nginx/conf.d/default.conf
# Remove the default site config that ships with the package to avoid conflicts
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create log directories expected by supervisor and nginx
RUN mkdir -p /var/log/supervisor /var/log/nginx

# Expose port 80 (Railway will map this to the public URL)
EXPOSE 80

# Healthcheck: verify the Flask backend is alive before marking the container healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Run supervisor to manage both Gunicorn and Nginx
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
