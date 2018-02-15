#!/usr/bin/env sh
set -x

openssl aes-256-cbc -K $encrypted_14dfe625469c_key -iv $encrypted_14dfe625469c_iv -in deploy-key.enc -out deploy-key -d
rm deploy-key.enc # Don't need it anymore
chmod 600 deploy-key
mv deploy-key ~/.ssh/id_rsa

tar -czf package.tgz build && \
scp package.tgz $REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_DIR && \
ssh $REMOTE_USER@$REMOTE_HOST 'bash -s' < ./scripts/untar.sh
