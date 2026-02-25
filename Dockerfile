FROM cgr.dev/chainguard/node:latest-dev AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM cgr.dev/chainguard/nginx:latest AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/items_reference.json /usr/share/nginx/html/items_reference.json

EXPOSE 8080
CMD ["-g", "daemon off;"]