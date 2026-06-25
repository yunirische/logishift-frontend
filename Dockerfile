# Stage 1: Build
FROM node:18-alpine as build

# Accept build arguments for Vite environment variables
ARG VITE_API_URL=http://localhost:3000/api/v1
ARG VITE_STATIC_URL=http://localhost:3000
ARG VITE_YANDEX_METRIKA_ID

# Set as environment variables for Vite build process
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STATIC_URL=$VITE_STATIC_URL
ENV VITE_YANDEX_METRIKA_ID=$VITE_YANDEX_METRIKA_ID

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
