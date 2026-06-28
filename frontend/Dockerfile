FROM node:20-slim AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./

RUN npm install --prefer-offline --no-audit

COPY frontend/ .

RUN ./node_modules/.bin/vite build

FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx","-g","daemon off;"]