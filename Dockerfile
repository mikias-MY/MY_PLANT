# --- Stage 1: Build/Prepare Frontend ---
FROM nginx:alpine as frontend-stage
COPY frontend /usr/share/nginx/html

# --- Stage 2: Final Monolithic Image ---
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
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

# Copy configurations
COPY nginx_prod.conf /etc/nginx/sites-available/default
# Ensure Nginx uses our config (on Debian/Slim, sites-enabled is used)
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
# Prevent nginx from running as a background daemon
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port 80 (Railway will map this to the public URL)
EXPOSE 80

# Run supervisor to manage both Gunicorn and Nginx
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
