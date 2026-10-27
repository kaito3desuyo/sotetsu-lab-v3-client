#!/bin/sh
export TZ=Asia/Tokyo
cd "$(dirname "$0")/../dist/build-by-ci" || exit 1
exec node server/server.mjs
