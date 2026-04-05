# Use the official Nginx image as a parent image
FROM nginx:alpine

# Copy the static files into the container
COPY . /usr/share/nginx/html

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
