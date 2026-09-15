FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
