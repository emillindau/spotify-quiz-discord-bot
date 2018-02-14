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
    this.admin = this._getIdFromMsg(msg);

    return new Promise((resolve, reject) => {
      this.voiceChannel.join()
        .then(connection => {
          this.connection = connection;
          return this.spotify.getTracks();
        })
        .then(({ tracks }) => {
          this.tracks = tracks;
          this.sendMessage('Quiz initialized!');
          resolve();
        })
        .catch(e => reject(e));
    })
  }

  start(msg) {
    if(this._isAdmin(msg)) {
      this._nextQuestion();
    }
  }

  end(msg, terminate) {
    if(!terminate) {
      this._play(__dirname + '/winner.mp3');
      this.sendMessage('The winner was: @' + this._getWinner().name);
      this.sendMessage(this._generateStanding());
    }

    if(terminate && !this._isAdmin(msg)) {
      return;
    } else {
      this.sendMessage('Stopping..');
    }

    this.client.clearInterval(this.clueInterval);
    this.client.clearInterval(this.durationInterval);

    this.client.setTimeout(() => {
      this._stop();
      this._exit();
      this.voiceChannel.leave();
      this.onEnd();
    }, 5000);
  }

  _nextQuestion() {
    if(this.numberOfQuestions >= this.maxNumberOfQuestions) {
      this.end();
      return;
    }

    this.currentTrack = this._generateTrack();
    this.clueIndex = 0;
    this.correctGuess = false;
    this.timesPlayedTrack = 1;
    this.numberOfQuestions++;

    if (this.clueInterval) {
      this.client.clearInterval(this.clueInterval);
    }

    if(this.durationInterval) {
      this.client.clearInterval(this.durationInterval);
    }

    const standings = this._generateStanding();
    if(standings !== '') {
      this.sendMessage(standings);
    }

    console.log('starting track', this.currentTrack);
    this._saveTrack(this.currentTrack)
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
                this.timesPlayedTrack++;
              }
            }, 2000);
          } else {
            this._nextQuestionWrong();
          }
        }
      }, 3000);
    
      this.clueInterval = this.client.setInterval(() => {
        const clue = this._getClue();
        if(clue === this.currentTrack.name) {
          this._nextQuestionWrong();
        } else {
          console.log('clue', clue);
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

  guess(guess, msg) {
    if (this.correctGuess) {
      return;
    }

    const userId = msg.author.id;
    const username = msg.author.username;
    this._addUser({ id: userId, name: username, points: 0 });

    const theGuess = guess.toLowerCase();
    const theAnswer = this.currentTrack.name.toLowerCase();
    const fuzzy = 0.5;
    let treshold;
    if (theAnswer.length >= 22) {
      treshold = 0.61;
    } else if(theAnswer.length >= 12) {
      treshold = 0.74;
    } else {
      treshold = 1;
    }

    const result = score(theAnswer, theGuess, fuzzy);

    if(result >= treshold) {
      this.correctGuess = true;
      this._stop();

      msg.reply(`That is indeed correct! The answer was ${this.currentTrack.artist} - ${this.currentTrack.name}. 10p to Slytherin!`);

      this.sendMessage('Next song!');

      this._addPointsToUser(userId, 10);
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
    return;
  }

  _addPointsToUser(userId, points) {
    const user = {...this.users.get(userId)};
    user.points += points;
    this.users.set(userId, user);
  }

  _generateTrack() {
    const random = Math.floor(Math.random() * (this.tracks.length - 0) + 0);
    const track = this.tracks[random];
    this.tracks.splice(random, 1);
    console.log('tracks.length', this.tracks.length);
    return track;
  }

  _saveTrack(track) {
    return new Promise((resolve, reject) => {
      const fileName = `${__dirname}/mp3/current.mp3`;
      const file = fs.createWriteStream(fileName);

      https.get(track.preview + '.mp3', function (response) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            mp3Duration(fileName, (err, duration) => {
              resolve({fileName, duration: (duration*1000)});
            });
          });
        })
      });
    })
  }

  _play(fileName) {
    this.accessTime = new Date().getTime();
    this.broadcast.playFile(fileName);
    this.fileName = fileName;
    this.dispatcher = this.connection.playBroadcast(this.broadcast);
    this.dispatcher.setVolume(0.5);
  };

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
    this.clueIndex++;

    let clue = '';

    for (let i = 0; i < answer.length; i++) {
      const character = answer[i];
      if (i < this.clueIndex) {
        clue += character;
        if (character === ' ') {
          this.clueIndex++;
        }
      } else {
        if (character === ' ') {
          clue += ' ';
        } else {
          clue += '●';
        }
      }
    }
    return clue;
  }

  _getWinner() {
    let max = 0;
    let user;
    this.users.forEach((value, key) => {
      if(value.points > max) {
        max = value.points;
        user = value;
      }
    });
    return user;
  }

  _generateStanding() {
    let users = [];

    if(this.users.size > 0) {
      this.users.forEach((value, key) => {
        if(value.points > 0) {
          users.push(value);
        }
      });
    }

    if (users.length > 0) {
      const sorted = users.sort((a, b) => {
        return a.points > b.points ? -1 : 1;
      });

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

  _getIdFromMsg(msg) {
    return msg.author.id;
  }

  _isAdmin(msg) {
    return this._getIdFromMsg(msg) === this.admin;
  }
}

module.exports = Game;