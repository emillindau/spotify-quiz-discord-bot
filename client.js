import Discord from 'discord.js';
import config from './config.json';

const client = new Discord.Client();

export async function getChannels(channels) {
  const channelMap = channels.reduce((acc, curr) => {
    acc[curr.type] = curr;
    return acc;
  }, {});

  const voiceChannel = await client.channels.fetch(channelMap.voice.id);
  const textChannel = await client.channels.fetch(channelMap.text.id);

  return { voiceChannel, textChannel };
}

export const sendMsg = async (message, msg) => {
  const channels = await retrieveChannelsFor(msg.channel.guild.id);
  const { textChannel } = await getChannels(channels);

  if (textChannel) {
    textChannel.send(message);
  }
};

export async function retrieveChannelsFor(guildId) {
  const allChannels = client.channels.cache
    .map((value, key) => {
      return {
        guild: {
          id: value.guild.id,
          name: value.guild.name
        },
        type: value.type,
        id: value.id,
        name: value.name
      };
    })
    .filter((c) => c.guild.id === guildId)
    .filter((c) => c.name.toLowerCase() === 'quiz');
  return allChannels;
}

client.login(config.discord.token);

export default client;
