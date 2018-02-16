#!/usr/bin/env sh
set -x

export NODE_ENV=production

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
nvm install v8.5.0
nvm use v8.5.0

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
mv build/* .

if [ ! -d mp3 ]; then
  # Control will enter here if $DIRECTORY doesn't exist.
  mkdir mp3
fi

npm install && \
pm2 start /var/bot/index.js