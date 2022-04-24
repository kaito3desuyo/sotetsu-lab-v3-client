FROM node:16

ENV NODE_ENV='development'

RUN npm i -g @angular/cli npm-check-updates

RUN mkdir -p /home/node/sotetsu-lab-v3-client && chown node:node /home/node/sotetsu-lab-v3-client

USER node

WORKDIR /home/node/sotetsu-lab-v3-client

COPY --chown=node:node ./package*.json ./

RUN npm i

COPY --chown=node:node . .