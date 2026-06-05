FROM node:20-alpine

WORKDIR /app

COPY package.json package.json
RUN npm install

COPY hardhat.config.cjs hardhat.config.cjs

EXPOSE 8545
