const fs = require('fs');
const https = require('https');
const score = require('string-score');
const mp3Duration = require('mp3-duration');

const Spotify = require('./spotify');

class Game {
  constructor(broadcast, client, onEnd) {
    this.voiceChannel = null;
    this.textChannel = null;
    this.spotify = new Spotify();
    this.broadcast = broadcast;
    this.client = client;
    this.onEnd = onEnd;
  }

  init({ voiceChannel, textChannel, msg, noOfQuestions }) {
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this.connection = null;
    this.tracks = null;
    this.dispatcher = null;
    this.currentTrack = null;
    this.clueInterval = null;
    this.durationInterval = null;
    this.clueIndex = 0;
    this.timesPlayedTrack = 0;
    this.correctGuess = false;
    this.currentTime = new Date().getTime();
    this.accessTime = new Date().getTime();
    this.previousTrackName = '';
    this.users = new Map();
    this.duration = 60000;
    this.numberOfQuestions = 0;
    this.maxNumberOfQuestions = noOfQuestions;
    this.fileName = '';
    this.admin = Game._getIdFromMsg(msg);

    return new Promise((resolve, reject) => {
      this.voiceChannel.join()
        .then((connection) => {
          this.connection = connection;
          return this.spotify.getTracks();
        })
        .then(({ tracks }) => {
          this.tracks = tracks;
          this.sendMessage('Quiz initialized!');
          resolve();
        })
        .catch(e => reject(e));
    });
  }

  start(msg) {
    if (this._isAdmin(msg)) {
      this._nextQuestion();
    }
  }

  end(msg, terminate) {
    if (!terminate) {
      this._play(`${__dirname}/winner.mp3`);
      this.sendMessage(`The winner was: @${this._getWinner().name}`);
      const standing = this._generateStanding();
      if (standing && standing !== '') {
        this.sendMessage(standing);
      }
    }

    if (terminate && !this._isAdmin(msg)) {
      return;
    }
    this.sendMessage('Stopping..');

    this.client.clearInterval(this.clueInterval);
    this.client.clearInterval(this.durationInterval);

    this.client.setTimeout(() => {
      this._stop();
      this._exit();
      this.voiceChannel.leave();
      this.onEnd(this.users);
    }, 5000);
  }

  _nextQuestion() {
    if (this.numberOfQuestions >= this.maxNumberOfQuestions) {
      this.end();
      return;
    }

    this.currentTrack = this._generateTrack();
    this.clueIndex = 0;
    this.correctGuess = false;
    this.timesPlayedTrack = 1;
    this.numberOfQuestions += 1;

    if (this.clueInterval) {
      this.client.clearInterval(this.clueInterval);
    }

    if (this.durationInterval) {
      this.client.clearInterval(this.durationInterval);
    }

    const standings = this._generateStanding();
    if (standings !== '') {
      this.sendMessage(standings);
    }

    console.log('starting track', this.currentTrack);
    Game._saveTrack(this.currentTrack)
      .then((file) => {
        this.duration = file.duration;
        this._play(file.fileName);
      })
      .catch(e => console.log(e));

    this.durationInterval = this.client.setInterval(() => {
      this.currentTime = new Date().getTime();

      const elapsed = this.currentTime - this.accessTime;

      if (elapsed >= this.duration && !this.correctGuess) {
        console.log('should replay!');
        if (this.timesPlayedTrack === 1) {
          this.client.setTimeout(() => {
            if (!this.correctGuess) {
              this._play(this.fileName);
              this.timesPlayedTrack += 1;
            }
          }, 2000);
        } else {
          this._nextQuestionWrong();
        }
      }
    }, 3000);

    this.clueInterval = this.client.setInterval(() => {
      const clue = this._getClue();
      if (clue === this.currentTrack.name) {
        this._nextQuestionWrong();
      } else {
        this.sendMessage(`Here is a clue: \`${clue}\``);
      }
    }, 7500);
  }

  _nextQuestionWrong() {
    this.sendMessage(`Nobody guessed right.. Sigh. The answer was ${this.currentTrack.artist} - ${this.currentTrack.name}`);

    this.sendMessage('Time for next song!');
    this._stop();
    this.correctGuess = true;
    this.client.setTimeout(() => {
      this._nextQuestion();
    }, 5000);
  }

  forceNext(msg, cb) {
    if (this._isAdmin(msg)) {
      this.sendMessage(`Okey then.\nThe answer was ${this.currentTrack.artist} - ${this.currentTrack.name}`);

      this.sendMessage('Time for next song instead (cowards)!');
      this._stop();
      this.correctGuess = true;
      this.client.setTimeout(() => {
        this._nextQuestion();
        cb();
      }, 5000);
    } else {
      cb();
    }
  }

  guess(guess, msg) {
    if (this.correctGuess) {
      return;
    }

    const { id: userId, username } = msg.author;
    this._addUser({
      id: userId, name: username, points: 0,
    });

    const theGuess = guess.toLowerCase();
    const theAnswer = this.currentTrack.name.toLowerCase();
    const fuzzy = 0.5;
    let treshold;
    if (theAnswer.length >= 22) {
      treshold = 0.61;
    } else if (theAnswer.length >= 12) {
      treshold = 0.74;
    } else {
      treshold = 1;
    }

    const result = score(theAnswer, theGuess, fuzzy);

    if (result >= treshold) {
      this.correctGuess = true;
      this._stop();

      msg.reply(`That is indeed correct! The answer was ${this.currentTrack.artist} - ${this.currentTrack.name}. 10p to Slytherin!`);
      this._addPointsToUser(userId, 10);

      if (this.numberOfQuestions >= this.maxNumberOfQuestions) {
        this._nextQuestion();
        return;
      }

      this.sendMessage('Next song coming up!');
      this.client.setTimeout(() => {
        this._nextQuestion();
      }, 5000);
    } else {
      msg.reply('That is WRONG! Terrible guess');
    }
  }

  _addUser(user) {
    if (!this.users.has(user.id)) {
      this.users.set(user.id, user);
    }
  }

  _addPointsToUser(userId, points) {
    const user = {
      ...this.users.get(userId),
    };
    user.points += points;
    this.users.set(userId, user);
  }

  _generateTrack() {
    const random = Math.floor(Math.random() * (this.tracks.length));
    const track = this.tracks[random];
    this.tracks.splice(random, 1);
    return track;
  }

  static _saveTrack(track) {
    return new Promise((resolve) => {
      const fileName = `${__dirname}/mp3/current.mp3`;
      const file = fs.createWriteStream(fileName);

      https.get(`${track.preview}.mp3`, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            mp3Duration(fileName, (err, duration) => {
              resolve({
                fileName,
                duration: (duration * 1000),
              });
            });
          });
        });
      });
    });
  }

  _play(fileName) {
    this.accessTime = new Date().getTime();
    this.broadcast.playFile(fileName);
    this.fileName = fileName;
    this.dispatcher = this.connection.playBroadcast(this.broadcast);
    this.dispatcher.setVolume(0.5);
  }

  _stop() {
    this.dispatcher.end();
    this.broadcast.end();
    this.dispatcher.destroy();
    this.client.clearInterval(this.clueInterval);
    this.client.clearInterval(this.durationInterval);
  }

  _exit() {
    this.broadcast.destroy();
    this.dispatcher.destroy();
  }

  _getClue() {
    const answer = this.currentTrack.name;
    this.clueIndex += 1;

    let clue = '';

    for (let i = 0; i < answer.length; i += 1) {
      const character = answer[i];
      if (i < this.clueIndex) {
        clue += character;
        if (character === ' ') {
          this.clueIndex += 1;
        }
      } else if (character === ' ') {
        clue += ' ';
      } else {
        clue += '●';
      }
    }
    return clue;
  }

  _getWinner() {
    let max = 0;
    let user;
    this.users.forEach((value) => {
      if (value.points > max) {
        max = value.points;
        user = value;
      }
    });
    return user || {
      name: 'Nobody',
    };
  }

  _generateStanding() {
    const users = [];

    if (this.users.size > 0) {
      this.users.forEach((value) => {
        if (value.points > 0) {
          users.push(value);
        }
      });
    }

    if (users.length > 0) {
      const sorted = users.sort((a, b) => (a.points > b.points ? -1 : 1));

      let standing = '```css\n === STANDINGS ===\n';
      sorted.forEach((val, idx) => {
        standing += `${idx + 1}. ${val.name} | ${val.points} p\n`;
      });
      standing += '```';
      return standing;
    }
    return '';
  }

  sendMessage(message) {
    if (this.textChannel) {
      this.textChannel.send(message)
        .catch(e => console.log(e));
    }
  }

  static _getIdFromMsg(msg) {
    return msg.author.id;
  }

  _isAdmin(msg) {
    return Game._getIdFromMsg(msg) === this.admin;
  }
}

module.exports = Game;
