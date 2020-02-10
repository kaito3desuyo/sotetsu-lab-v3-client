FROM node:10.15-alpine
WORKDIR /client
COPY package*.json ./
RUN npm i -g @angular/cli && npm install