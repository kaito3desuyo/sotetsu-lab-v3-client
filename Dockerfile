FROM node:lts

RUN npm i -g @angular/cli

RUN mkdir -p /home/sotetsu-lab-v3-client && chown node:node /home/sotetsu-lab-v3-client

USER node

ENV NODE_ENV='development'

WORKDIR /home/sotetsu-lab-v3-client

COPY . /home/sotetsu-lab-v3-client

RUN npm i
