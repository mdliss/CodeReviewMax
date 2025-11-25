FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies based on lockfile for reproducible builds
COPY package.json package-lock.json ./
RUN npm ci

# Build the production bundle
FROM base AS build
COPY . .
RUN npm run build

# Serve the static assets with a small web server
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
