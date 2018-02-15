#!/usr/bin/env sh
set -x

export NODE_ENV=production

cd /var/bot/ && \
tar zxvf package.tgz -C . && \
mv build/package.json . && \
npm install && \
pm2 stop index && \
pm2 start index