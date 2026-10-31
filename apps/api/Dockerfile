FROM node:24-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:api

FROM node:24-alpine
WORKDIR /app
COPY --from=build /workspace/dist/api/server.cjs ./server.cjs
EXPOSE 3000
CMD ["node", "server.cjs"]
