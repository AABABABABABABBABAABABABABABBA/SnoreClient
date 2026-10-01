FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 DATA_DIR=/data
COPY package.json ./
COPY src ./src
COPY public ./public
VOLUME ["/data"]
EXPOSE 8080
USER node
CMD ["node", "src/index.js"]
