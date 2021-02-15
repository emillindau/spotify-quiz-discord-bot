import { MessageAttachment } from 'discord.js';
import client, { getChannels, sendMsg, retrieveChannelsFor } from './client';
import rClient, { saveResult, getAllPlayers, clearAll } from './store';
import Game from './game';
import { generateHelpBlock, generateSchedule } from './msg-helpers';

let game;
let navySealsCopyPasta = false;

let currentStatus = 'none';
let cheatMode = false;
export const SUPER_ADMIN_ID = '98453471065284608';

process.on('exit', () => {
  client.destroy();
  rClient.quit();
});

process.on('SIGINT', () => {
  process.exit(0);
});

const getOffset = (value, total) => {
  const strVal = String(value);
  const { length } = strVal;
  const offset = total - length;
  let result = `${strVal}`;
  for (let i = 0; i < offset; i += 1) {
    result += ' ';
  }
  return result;
};

const getHighscore = () =>
  new Promise(async (resolve, reject) => {
    try {
      const players = await getAllPlayers();
      if (players && players.length > 0) {
        const sorted = players
          .sort((a, b) => (Number(a.rating) > Number(b.rating) ? -1 : 1))
          .slice(0, 10);
        let standing = '```css\n === WORLD RANKING by PGS ===\n';
        standing +=
          'Pos. Name       | Points       | Times played       | Avg points       | Scr/Q       | Rating\n';

        sorted.forEach((val, idx) => {
          standing += `  ${
            idx + 1 > 9 ? idx + 1 : '0' + (idx + 1)
          }. ${getOffset(val.name, 11)}| ${getOffset(
            val.points,
            13
          )}| ${getOffset(val.timesPlayed, 19)}| ${getOffset(
            Math.floor(val.points / val.timesPlayed),
            17
          )}| ${getOffset(val.avgScorePerQuestion, 12)}| ${getOffset(
            val.rating,
            0
          )}\n`;
        });

        standing += '```';
        resolve(standing);
      } else {
        resolve('No current rankings');
      }
    } catch (e) {
      console.log(e);
    }
  });

const prepareGame = async (msg, cons) => {
  const channels = await retrieveChannelsFor(msg.channel.guild.id);
  const { voiceChannel, textChannel } = await getChannels(channels);

  if (voiceChannel && textChannel) {
    let noOfQuestions = cons || 20;
    if (noOfQuestions > 100) {
      noOfQuestions = 100;
    } else if (noOfQuestions <= 0) {
      noOfQuestions = 1;
    }

    try {
      await game.init({
        voiceChannel,
        textChannel,
        msg,
        noOfQuestions
      });
    } catch (e) {
      console.log('failed to init game', e);
    }
    return true;
  }
  msg.reply('There is no Quiz Voice or TextChannel :(');
  return false;
};

const handleActions = async (action, cons, msg) => {
  switch (action) {
    case 'play':
      if (currentStatus === 'none') {
        await prepareGame(msg, cons);
        currentStatus = 'play';
      }
      break;
    case 'start':
      if (currentStatus === 'play') {
        game.start(msg);
        currentStatus = 'started';
      }
      break;
    case 'guess':
      if (currentStatus === 'started') {
        game.guess(cons, msg, cheatMode);
      }
      break;
    case 'stop':
      if (currentStatus === 'started' || currentStatus === 'play') {
        currentStatus = 'stopping';
        game.end(msg, true);
      }
      break;
    case 'help':
      sendMsg(generateHelpBlock(), msg);
      break;
    case 'status':
      sendMsg(`Current status is **${currentStatus}**`, msg);
      break;
    case 'next':
      if (currentStatus === 'started') {
        currentStatus = 'next';
        await game.forceNext(msg);
        // Switch back.
        currentStatus = 'started';
      }
      break;
    case 'ranking':
      try {
        const res = await getHighscore();
        sendMsg(res, msg);
      } catch (e) {
        console.log(e);
      }
      break;
    case 'clear':
      if (msg.author && msg.author.id && msg.author.id === SUPER_ADMIN_ID) {
        try {
          await clearAll();
          sendMsg('Rankings cleared..', msg);
        } catch (e) {
          console.log(e);
        }
      }
      break;
    case 'schedule':
      msg.reply(generateSchedule(), msg);
      break;
    case 'son': {
      const attachment = new MessageAttachment(
        'https://cdn.discordapp.com/attachments/688669927091208260/694164033414103090/emil_von_lindau.jpg'
      );
      msg.channel.send('Papa?', attachment);
      break;
    }
    default:
      break;
  }
};

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('Quiz Bot!');

  game = new Game(client, (users, noOfQuestions) => {
    currentStatus = 'none';
    saveResult(users, noOfQuestions);
  });
});

client.on('message', (msg) => {
  if (
    msg.author &&
    msg.author.id &&
    msg.author.id === SUPER_ADMIN_ID &&
    currentStatus === 'started' &&
    msg.content.includes('↑ ↑ ↓ ↓ ← → ← → B A')
  ) {
    // msg.reply('allah ybarek f papa wahed');
    cheatMode = true;
    msg.reply(
      'CHEAT MODE ACTIVATED!!!!!!!!!!!!!!!!! BEAT THE CHEATER AND GET EXTRA POINTS!!!'
    );
    setTimeout(() => {
      cheatMode = false;
      sendMsg('CHEAT MODE DEACTIVATED!!!');
    }, 60000 * 2);
  }

  if (
    currentStatus !== 'started' &&
    msg.content.includes('hur mår du') &&
    !msg.author.bot
  ) {
    msg.reply('Mecke bra, hur mår du?');
  }

  const isCorrectChannel = msg.channel.name === 'quiz';
  if (!msg.author.bot && isCorrectChannel) {
    if (msg.content.includes('npm install wahed')) {
      msg.reply('`> wahed@1.0.0 start /Users/$USER/dev/wahed installed`');
    }

    if (msg.content.includes('wahed')) {
      const splitAction = msg.content.split(' ');
      if (splitAction.length > 1) {
        const action = splitAction[1].toLowerCase();
        const cons = msg.content
          .split(' ')
          .slice(2, msg.content.length)
          .join(' ')
          .toLowerCase();
        handleActions(action, cons, msg);
      } else {
        msg.reply('Yes? Try `wahed help`');
      }
    } else if (currentStatus === 'started') {
      if (!msg.author.bot) {
        // Handle everything as a guess
        if (msg.content && msg.content.length > 0) {
          handleActions('guess', msg.content.toLowerCase(), msg);

          if (msg.content.includes('fuck you') && !navySealsCopyPasta) {
            navySealsCopyPasta = true;
            msg.reply(
              "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Navy Seals, and I've been involved in numerous secret raids on Al-Quaeda, and I have over 300 confirmed kills. I am trained in gorilla warfare and I'm the top sniper in the entire US armed forces. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Earth, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of spies across the USA and your IP is being traced right now so you better prepare for the storm, maggot. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bare hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the United States Marine Corps and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will shit fury all over you and you will drown in it. You're fucking dead, kiddo."
            );
          }
        }
      }
    }
  }
});

// https://discordapp.com/oauth2/authorize?&client_id=413007747785949194&scope=bot&permissions=0
