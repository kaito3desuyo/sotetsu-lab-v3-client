ARG BASE_IMAGE="node:16"
ARG APP_NAME="sotetsu-lab-v3-client"

FROM ${BASE_IMAGE} as base

################################################################################

FROM base as install-dependencies

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends fonts-noto fonts-noto-cjk \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV="development"
RUN npm i -g @angular/cli npm-check-updates
USER node

################################################################################

FROM install-dependencies as ci-base

################################################################################

FROM install-dependencies as development-base

ARG APP_NAME
RUN mkdir /home/node/${APP_NAME}
WORKDIR /home/node/${APP_NAME}
COPY --chown=node:node ./package*.json ./
RUN npm ci --legacy-peer-deps
COPY --chown=node:node . .

################################################################################

FROM development-base as production-build

RUN npm run build:prod -- --output-path=./dist/build-by-docker

################################################################################

# TODO: production-hosting