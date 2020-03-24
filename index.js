import client, { getChannels, sendMsg } from './client';
import rClient, { saveResult, getAllPlayers, clearAll } from './store';
import Game from './game';

let game;

let currentStatus = 'none';
const SUPER_ADMIN_ID = '98453471065284608';

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
  new Promise((resolve, reject) => {
    getAllPlayers()
      .then((players) => {
        if (players && players.length > 0) {
          const sorted = players.sort((a, b) => (a.rating > b.rating ? -1 : 1));
          let standing = '```css\n === WORLD RANKING ===\n';
          standing +=
            'Pos. Name       | Points       | Times played       | Avg points       | Scr/Q       | Rating\n';

          sorted.forEach((val, idx) => {
            standing += `  ${idx + 1}. ${getOffset(val.name, 11)}| ${getOffset(
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
      })
      .catch((e) => console.log(e));
  });

const _generateHelpBlock = () =>
  '```css\n===== HELP =====\n\n' +
  '- Commands -\n' +
  '* wahed play (int) - Initiate play session with optional max questions parameter\n' +
  '* wahed start - Start the Quiz\n' +
  '* wahed stop [admin] - Stops the Quiz\n' +
  '* wahed next [admin] - Skips to next song\n' +
  '* wahed guess (your guess) - Guess on current song. Or just type\n' +
  '* wahed help - Generates this page\n' +
  '* wahed ranking - Display current Highscores\n' +
  '* wahed status - Show current status\n\n' +
  '- Rules -\n' +
  '# Guess song by typing\n' +
  '# Correct guess gives 10 points\n' +
  '# Games done when 20 questions are asked\n' +
  '# Songs are 30s and will be played 2 times\n' +
  '# Thats it..\n\n' +
  '===== HELP =====\n' +
  '```';

const prepareGame = async (msg, cons) => {
  const { voiceChannel, textChannel } = await getChannels();

  if (voiceChannel && textChannel) {
    let noOfQuestions = cons || 20;
    if (noOfQuestions > 50) {
      noOfQuestions = 50;
    } else if (noOfQuestions <= 0) {
      noOfQuestions = 1;
    }

    try {
      await game.init({
        voiceChannel,
        textChannel,
        msg,
        noOfQuestions,
      });
    } catch (e) {
      console.log('failed to init game', e);
    }
    return true;
  }
  msg.reply('There is no Quiz Voice or TextChannel :(');
  return false;
};

const handleActions = (action, cons, msg) => {
  switch (action) {
    case 'play':
      if (currentStatus === 'none') {
        prepareGame(msg, cons).then(() => {
          currentStatus = 'play';
        });
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
        game.guess(cons, msg);
      }
      break;
    case 'stop':
      if (currentStatus === 'started' || currentStatus === 'play') {
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
    case 'next':
      if (currentStatus === 'started') {
        currentStatus = 'next';
        game.forceNext(msg, () => {
          // Switch back.
          currentStatus = 'started';
        });
      }
      break;
    case 'ranking':
      getHighscore()
        .then((res) => {
          sendMsg(res);
        })
        .catch((e) => console.log(e));
      break;
    case 'clear':
      if (msg.author && msg.author.id && msg.author.id === SUPER_ADMIN_ID) {
        clearAll()
          .then(() => sendMsg('Rankings cleared..'))
          .catch((e) => console.log(e));
      }
      break;
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
        }
      }
    }
  }
});

// https://discordapp.com/oauth2/authorize?&client_id=413007747785949194&scope=bot&permissions=0
