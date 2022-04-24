FROM node:14

RUN npm i -g @angular/cli npm-check-updates

RUN mkdir -p /home/node/sotetsu-lab-v3-client && chown node:node /home/node/sotetsu-lab-v3-client

USER node

ENV NODE_ENV='development'

WORKDIR /home/node/sotetsu-lab-v3-client

COPY . /home/node/sotetsu-lab-v3-client

RUN npm i
