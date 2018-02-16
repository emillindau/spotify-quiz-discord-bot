#!/usr/bin/env sh
set -x

export NODE_ENV=production

checkpm2() {
    if hash pm2 2>/dev/null; then
        echo pm2 exists
    else
        npm install pm2 -g
    fi
}

checkpm2

cd /var/bot/ && \
pm2 stop index || echo Already stopped && \
tar zxvf package.tgz -C . && \
mv build/* . && \
npm install && \
pm2 start /var/bot/index.js