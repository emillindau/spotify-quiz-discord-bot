#!/usr/bin/env sh
set -x

openssl aes-256-cbc -K $encrypted_14dfe625469c_key -iv $encrypted_14dfe625469c_iv -in deploy-key.enc -out deploy-key -d
rm deploy-key.enc # Don't need it anymore
chmod 600 deploy-key
mv deploy-key ~/.ssh/id_rsa


jq -n --arg discordToken "$discordToken" --arg clientId "$clientId" --arg clientSecret "$clientSecret" '{discord: {token: $discordToken, voiceChannel: "Quiz", textChannel: "quiz"}, spotify: {playlist: "11ueqwsyteIPQ9bowZy05e", clientId: $clientId, clientSecret: $clientSecret}}' > config.json
mv config.json build/config.json

tar -czf package.tgz build && \
scp package.tgz $REMOTE_USER@$REMOTE_HOST:$REMOTE_APP_DIR && \
ssh $REMOTE_USER@$REMOTE_HOST 'bash -s' < ./scripts/untar.sh
