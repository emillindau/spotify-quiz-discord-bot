const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');
const ffmpeg = require('ffmpeg');
const config = require('./config.json');
const Game = require('./game');
let game;

let currentStatus = 'none';

process.on('exit', (code) => {
  client.destroy();
});

process.on('SIGINT', () => {
  process.exit(0);
});

const _generateHelpBlock = () => {
  return '```css\n===== HELP =====\n\n' +
    '- Commands -\n' +
    '* anna play (int) - Initiate play session with optional max questions parameter\n' +
    '* anna start - Start the Quiz\n' +
    '* anna stop - Stops the Quiz\n' +
    '* anna guess (your guess) - Guess on current song. Or just type\n' +
    '* anna help - Generates this page\n' +
    '* anna status - Show current status\n\n' +
    '- Rules -\n' +
    '# Guess song by typing\n' +
    '# Correct guess gives 10 points\n' +
    '# Games done when 20 questions are asked\n' +
    '# Songs are 30s and will be played 2 times\n' + 
    '# Thats it..\n\n' +
    '===== HELP =====\n' +
    '```';
}

handleActions = (action, cons, msg) => {
  switch(action) {
    case 'play':
      if(currentStatus === 'none') {
        prepareGame(msg, cons).then(() => {
          currentStatus = 'play';
        });
      }
    break;
    case 'start':
      if(currentStatus === 'play') {
        game.start(msg);
        currentStatus = 'started';
      }
    break;
    case 'guess':
      if(currentStatus === 'started') {
        game.guess(cons, msg);
      }
    break;
    case 'stop':
      if(currentStatus === 'started' || currentStatus === 'play') {
        currentStatus = 'stopping';
        game.end(msg, true);
      }
    break;
    case 'help':
      sendMsg(_generateHelpBlock());
    break;
    case 'status':
      sendMsg(`Current status is **${currentStatus}**`);
    break;
    default:
    break;
  }
};

const sendMsg = (message) => {
  const textChannel = client.channels.filterArray((channel) => {
    return channel.name === 'quiz';
  });
  if (textChannel && textChannel.length > 0) {
    textChannel[0].send(message);
  }
};

const prepareGame = async(msg, cons) => {
  const quizChannels = client.channels.filterArray((channel) => {
    return channel.name === config.discord.voiceChannel;
  });

  const textChannels = client.channels.filterArray((channel) => {
    return channel.name === config.discord.textChannel;
  });

  const voiceExists = quizChannels && quizChannels.length > 0;
  const textExists = textChannels && textChannels.length > 0;

  if (voiceExists && textExists) {
    const voiceChannel = quizChannels[0];
    const textChannel = textChannels[0];

    let noOfQuestions = cons || 20;
    if(noOfQuestions > 50) {
      noOfQuestions = 50;
    } else if(noOfQuestions <= 0) {
      noOfQuestions = 1;
    }

    await game.init({voiceChannel, textChannel, msg, noOfQuestions});
    return true;
  } else {
    msg.reply('There is no Quiz Voice or TextChannel :(');
    return false;
  }
};

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('Quiz Bot!');

  const broadcast = client.createVoiceBroadcast();
  game = new Game(broadcast, client, function onEnd() {
    currentStatus = 'none';
  });
});

client.on('message', (msg) => {
  if (!msg.author.bot) {
    if (msg.content.includes('anna')) {
      const splitAction = msg.content.split(' ');
      if (splitAction.length > 1) {
        const action = splitAction[1].toLowerCase();
        const cons = msg.content.split(' ').slice(2, msg.content.length).join(' ').toLowerCase();
        handleActions(action, cons, msg);
      } else {
        msg.reply('Yes? Try `anna help`');
      }
    } else if (currentStatus === 'started') {
      if(!msg.author.bot) {
        // Handle everything as a guess
        if(msg.content && msg.content.length > 0) {
          handleActions('guess', msg.content.toLowerCase(), msg);
        }
      }
    }
  }

});

client.login(config.discord.token);

//https://discordapp.com/oauth2/authorize?&client_id=413007747785949194&scope=bot&permissions=0
