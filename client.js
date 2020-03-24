import Discord from 'discord.js';
import config from './config.json';

const client = new Discord.Client();

const VOICE_QUIZ_CHANNEL = '689027148614336542';
const TEXT_QUIZ_CHANNEL = '689130943767642262';

export async function getChannels() {
  const voiceChannel = await client.channels.fetch(VOICE_QUIZ_CHANNEL);
  const textChannel = await client.channels.fetch(TEXT_QUIZ_CHANNEL);

  return { voiceChannel, textChannel };
}

export const sendMsg = async (message) => {
  const { textChannel } = await getChannels();

  if (textChannel) {
    textChannel.send(message);
  }
};

client.login(config.discord.token);

export default client;
