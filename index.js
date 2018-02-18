const Discord = require('discord.js');
const { promisify } = require('util');
const redis = require('redis');
const config = require('./config.json');
const Game = require('./game');

const client = new Discord.Client();
const rClient = redis.createClient();
const getAsync = promisify(rClient.hget).bind(rClient);
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

const ratingCalc = (user) => {
  const {
    points,
    timesPlayed,
    firstPlaces,
    avgScorePerQuestion,
  } = user;

  let percentage = 0;
  if (firstPlaces !== 0 && timesPlayed !== 0) {
    if (firstPlaces === timesPlayed) {
      percentage = 100;
    } else if (firstPlaces === 0) {
      percentage = 0;
    } else {
      const p = (timesPlayed / firstPlaces) * 100;
      const result = ((p / 100) - 1).toFixed(2);
      percentage = 100 * result;
    }
  }
  const scalar = (100 + avgScorePerQuestion) / 100;
  const finalRating = (points + percentage) * scalar;
  return finalRating.toFixed(2);
};

const getAllPlayers = () => (
  new Promise((resolve, reject) => {
    rClient.hkeys('names', async (err, replies) => {
      if (replies && replies.length > 0) {
        const players = replies.map(async (reply) => {
          const name = await getAsync(reply, 'name');
          const points = await getAsync(reply, 'points');
          const timesPlayed = await getAsync(reply, 'timesPlayed');
          const firstPlaces = await getAsync(reply, 'firstPlaces');
          const avgScorePerQuestion = await getAsync(reply, 'scorePerQuestion');

          const rating = ratingCalc({
            points: Number(points),
            timesPlayed: Number(timesPlayed),
            firstPlaces: Number(firstPlaces),
            avgScorePerQuestion: Number(avgScorePerQuestion),
          });

          return {
            name,
            rating,
            points: Number(points),
            timesPlayed: Number(timesPlayed),
            firstPlaces: Number(firstPlaces),
            avgScorePerQuestion: Number(avgScorePerQuestion),
          };
        });

        Promise.all(players)
          .then(p => resolve(p));
      } else {
        resolve([]);
      }
    });
  })
);

const _clearAll = () => {
  return new Promise((resolve, reject) => {
    rClient.hkeys('names', (err, replies) => {
      if (err) {
        reject(err);
      }
      if (replies && replies.length > 0) {
        replies.forEach(reply => rClient.del(reply));
        rClient.del('names');
      }
      resolve();
    });
  });
};

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

const getHighscore = () => (
  new Promise((resolve, reject) => {
    getAllPlayers()
      .then((players) => {
        if (players && players.length > 0) {
          const sorted = players.sort((a, b) => (a.rating > b.rating ? -1 : 1));
          let standing = '```css\n === WORLD RANKING ===\n';
          standing += 'Pos. Name       | Points       | Times played       | Avg points       | Scr/Q       | Rating\n';

          sorted.forEach((val, idx) => {
            standing += `  ${idx + 1}. ${getOffset(val.name, 11)}| ${getOffset(val.points, 13)}| ${getOffset(val.timesPlayed, 19)}| ${getOffset(Math.floor(val.points / val.timesPlayed), 17)}| ${getOffset(val.avgScorePerQuestion, 12)}| ${getOffset(val.rating, 0)}\n`;
          });

          standing += '```';
          resolve(standing);
        } else {
          resolve('No current rankings');
        }
      }).catch(e => console.log(e));
  })
);

const saveResult = async (users, noOfQuestions) => {
  if (users.size > 0) {
    let sortedUsers = [];
    users.forEach(u => sortedUsers.push(u));
    sortedUsers = sortedUsers.sort((a, b) => (a.points > b.points ? -1 : 1));
    sortedUsers[0].firstPlace = true;

    sortedUsers.forEach(async (u) => {
      const name = await getAsync(u.name, 'name');
      const points = await getAsync(u.name, 'points');
      const timesPlayed = await getAsync(u.name, 'timesPlayed');
      const firstPlaces = await getAsync(u.name, 'firstPlaces');
      const avgScorePerQuestion = await getAsync(u.name, 'scorePerQuestion');

      if (!name) {
        rClient.hset(u.name, 'name', u.name);
        rClient.hset(u.name, 'points', u.points);
        rClient.hset(u.name, 'timesPlayed', 1);
        rClient.hset(u.name, 'scorePerQuestion', Math.floor(Number(u.points) / noOfQuestions));
        if (u.firstPlace) {
          rClient.hset(u.name, 'firstPlaces', 1);
        } else {
          rClient.hset(u.name, 'firstPlaces', 0);
        }
        rClient.hset('names', u.name, true);
      } else {
        const p = Number(points) + Number(u.points);
        const tp = Number(timesPlayed) + 1;
        const avgScore = Math.floor(Number(u.points) / noOfQuestions);
        const added = avgScore + Number(avgScorePerQuestion);
        const spq = Math.floor(added / 2);
        let fp = Number(firstPlaces);
        if (u.firstPlace) {
          fp += 1;
        }
        rClient.hset(u.name, 'firstPlaces', fp);
        rClient.hset(u.name, 'points', p);
        rClient.hset(u.name, 'timesPlayed', tp);
        rClient.hset(u.name, 'scorePerQuestion', spq);
      }
    });
  }
};

rClient.on('error', err => console.log('Redis error', err));

const _generateHelpBlock = () => (
  '```css\n===== HELP =====\n\n' +
  '- Commands -\n' +
  '* anna play (int) - Initiate play session with optional max questions parameter\n' +
  '* anna start - Start the Quiz\n' +
  '* anna stop [admin] - Stops the Quiz\n' +
  '* anna next [admin] - Skips to next song\n' +
  '* anna guess (your guess) - Guess on current song. Or just type\n' +
  '* anna help - Generates this page\n' +
  '* anna ranking - Display current Highscores\n' +
  '* anna status - Show current status\n\n' +
  '- Rules -\n' +
  '# Guess song by typing\n' +
  '# Correct guess gives 10 points\n' +
  '# Games done when 20 questions are asked\n' +
  '# Songs are 30s and will be played 2 times\n' +
  '# Thats it..\n\n' +
  '===== HELP =====\n' +
  '```'
);

const sendMsg = (message) => {
  const textChannel = client.channels.filterArray(channel => (
    channel.name === 'quiz'
  ));
  if (textChannel && textChannel.length > 0) {
    textChannel[0].send(message);
  }
};

const prepareGame = async (msg, cons) => {
  const quizChannels = client.channels.filterArray(channel => (
    channel.name === config.discord.voiceChannel
  ));

  const textChannels = client.channels.filterArray(channel => (
    channel.name === config.discord.textChannel
  ));

  const voiceExists = quizChannels && quizChannels.length > 0;
  const textExists = textChannels && textChannels.length > 0;

  if (voiceExists && textExists) {
    const voiceChannel = quizChannels[0];
    const textChannel = textChannels[0];

    let noOfQuestions = cons || 20;
    if (noOfQuestions > 50) {
      noOfQuestions = 50;
    } else if (noOfQuestions <= 0) {
      noOfQuestions = 1;
    }

    await game.init({
      voiceChannel, textChannel, msg, noOfQuestions,
    });
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
        .catch(e => console.log(e));
      break;
    case 'clear':
      if (msg.author && msg.author.id && msg.author.id === SUPER_ADMIN_ID) {
        _clearAll()
          .then(() => sendMsg('Rankings cleared..'))
          .catch(e => console.log(e));
      }
      break;
    default:
      break;
  }
};

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('Quiz Bot!');

  const broadcast = client.createVoiceBroadcast();
  game = new Game(broadcast, client, (users, noOfQuestions) => {
    currentStatus = 'none';
    saveResult(users, noOfQuestions);
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
      if (!msg.author.bot) {
        // Handle everything as a guess
        if (msg.content && msg.content.length > 0) {
          handleActions('guess', msg.content.toLowerCase(), msg);
        }
      }
    }
  }
});

client.login(config.discord.token);

// https://discordapp.com/oauth2/authorize?&client_id=413007747785949194&scope=bot&permissions=0
