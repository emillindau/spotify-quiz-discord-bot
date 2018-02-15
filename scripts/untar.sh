#!/usr/bin/env sh
set -x

export NODE_ENV=production

cd /var/bot/ && \
pm2 stop index && \
tar zxvf package.tgz -C . && \
mv build/package.json . && \
npm install && \
pm2 start index