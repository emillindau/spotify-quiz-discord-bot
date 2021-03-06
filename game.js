import fs from 'fs';
import https from 'https';
import mp3Duration from 'mp3-duration';
import FuzzySet from 'fuzzyset.js';
import ytdl from 'ytdl-core-discord';
import Spotify from './spotify';
import clueHandler from './clue-handler';
import isSpecial, { getSpecial } from './specials';
import { SUPER_ADMIN_ID } from './index';
import { searchYoutube } from './services/youtube';

class Game {
  constructor(client, onEnd) {
    this.voiceChannel = null;
    this.textChannel = null;
    this.spotify = new Spotify();
    this.client = client;
    this.onEnd = onEnd;
  }

  async init({ voiceChannel, textChannel, msg, noOfQuestions }) {
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
    this.yeetCounter = 0;

    console.log('Init game');
    return new Promise(async (resolve, reject) => {
      try {
        this.connection = await this.voiceChannel.join();
        this.tracks = await this.spotify.getTracks();
        const initEmoji = this.client.guilds.cache
          .get('688669926457999400')
          .emojis.cache.get('688671879191461899');
        // eslint-disable-next-line no-useless-escape
        this.sendMessage(`Quiz initialized! ${initEmoji}`);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  start(msg) {
    if (this._isAdmin(msg)) {
      this._nextQuestion();
    }
  }

  end(msg, terminate) {
    if (!terminate) {
      this._play(`${__dirname}/winner.mp3`, 1.5);
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
      this.onEnd(this.users, this.maxNumberOfQuestions);
    }, 5000);
  }

  async _nextQuestion() {
    if (this.numberOfQuestions >= this.maxNumberOfQuestions) {
      this.end();
      return;
    }

    this.currentTrack = await this._generateTrack();
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
    clueHandler.reset(this.currentTrack.name);

    if (!this.currentTrack.preview) {
      this._nextQuestion();
    }

    if (this.currentTrack.source === 'spotify') {
      try {
        const file = await Game._saveTrack(this.currentTrack);
        this.duration = file.duration;
        this._play(file.fileName);
      } catch (e) {
        console.log('Something went wrong playing spotify');
        this._nextQuestion();
      }
    } else {
      this.duration = 120 * 1000;

      try {
        const res = await ytdl(this.currentTrack.preview);
        this._play(res);
      } catch (e) {
        this._nextQuestion();
      }
    }

    this.durationInterval = this.client.setInterval(() => {
      this.currentTime = new Date().getTime();

      const elapsed = this.currentTime - this.accessTime;

      if (elapsed >= this.duration && !this.correctGuess) {
        console.log('should replay!');
        if (
          this.timesPlayedTrack === 1 ||
          this.currentTrack.source !== 'spotify'
        ) {
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
      const { clue, revealed } = clueHandler.getClue();

      if (!revealed) {
        this.sendMessage(`Here's a hint: \`${clue}\``);
      } else {
        this._nextQuestionWrong();
      }
    }, 7500);
  }

  _nextQuestionWrong() {
    this.sendMessage(
      `Nobody guessed right.. Sigh. The answer was ${this.currentTrack.artist} - ${this.currentTrack.name}`
    );

    this.sendMessage('Time for next song!');
    this._stop();
    this.correctGuess = true;
    this.client.setTimeout(() => {
      this._nextQuestion();
    }, 5000);
  }

  forceNext(msg, cb) {
    if (this._isAdmin(msg)) {
      this.sendMessage(
        `Okey then.\nThe answer was ${this.currentTrack.artist} - ${this.currentTrack.name}`
      );

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

  guess(guess, msg, cheatMode) {
    let cheater = false;

    if (guess === 'yeet') {
      this.yeetCounter++;
      if (this.yeetCounter >= 50) {
        this.yeetCounter = 0;
        this._nextQuestion();
        return;
      }
    }

    if (this.correctGuess) {
      return;
    }

    const { id: userId, username } = msg.author;
    this._addUser({
      id: userId,
      name: username,
      points: 0
    });

    if (cheatMode && userId === SUPER_ADMIN_ID) {
      this.correctGuess = true;
      this._stop();

      const scoreCalc = this._getScore(false);
      msg.reply(
        `WOW! YOU ARE INSANELY GOOD! The answer was ${this.currentTrack.artist} - ${this.currentTrack.name}. ${scoreCalc}p to THE CHAMPION!`
      );
      this._addPointsToUser(userId, scoreCalc, false);

      if (this.numberOfQuestions >= this.maxNumberOfQuestions) {
        this._nextQuestion();
        return;
      }

      this.sendMessage('Next song coming up!');
      this.client.setTimeout(() => {
        this._nextQuestion();
      }, 5000);
      return;
    }

    const theGuess = guess.toLowerCase().replace(/\s/g, '');
    const theAnswer = this.currentTrack.name.toLowerCase().replace(/\s/g, '');

    const fuzzyAnswer = FuzzySet([theAnswer]);
    const result = fuzzyAnswer.get(theGuess);
    if (result && result.length) {
      let treshold;
      if (theAnswer.length >= 22) {
        treshold = 0.85;
      } else if (theAnswer.length >= 12) {
        treshold = 0.95;
      } else {
        treshold = 1;
      }

      const [actual] = result;
      const [guessScore] = actual;

      if (guessScore >= treshold) {
        this.correctGuess = true;
        this._stop();

        const scoreCalc = this._getScore(cheatMode);
        if (cheatMode) {
          msg.reply(
            `What? You beat the cheater.. The answer was ${this.currentTrack.artist} - ${this.currentTrack.name}. ${scoreCalc}p to Gryffindor!`
          );
        } else {
          msg.reply(
            `That is indeed correct! The answer was ${this.currentTrack.artist} - ${this.currentTrack.name}. ${scoreCalc}p to Slytherin!`
          );
        }

        this._addPointsToUser(userId, scoreCalc);

        if (this.numberOfQuestions >= this.maxNumberOfQuestions) {
          this._nextQuestion();
          return;
        }

        this.sendMessage('Next song coming up!');
        this.client.setTimeout(() => {
          this._nextQuestion();
        }, 5000);
      } else {
        // msg.reply('That is WRONG! Terrible guess');
      }
    } else {
      // msg.reply('Are you even trying?');
    }
  }

  _addUser(user) {
    if (!this.users.has(user.id)) {
      this.users.set(user.id, user);
    }
  }

  _addPointsToUser(userId, points) {
    const user = {
      ...this.users.get(userId)
    };
    user.points += points;
    this.users.set(userId, user);
  }

  async _generateTrack() {
    const random = Math.floor(Math.random() * this.tracks.length);
    const track = this.tracks[random];
    this.tracks.splice(random, 1);

    if (!track.preview) {
      const res = await searchYoutube(`${track.artist} ${track.name}`);
      track.source = 'youtube';
      track.preview = res;
    }

    if (isSpecial(track.uri)) {
      const res = getSpecial(track.uri);
      return { ...track, name: res.name, artist: res.artistName };
    }
    return track;
  }

  static _saveTrack(track) {
    return new Promise((resolve, reject) => {
      if (!track.preview) {
        reject();
      }

      const fileName = `${__dirname}/mp3/current.mp3`;
      const file = fs.createWriteStream(fileName);

      https.get(`${track.preview}.mp3`, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            mp3Duration(fileName, (err, duration) => {
              resolve({
                fileName,
                duration: duration * 1000
              });
            });
          });
        });
      });
    });
  }

  _play(fileName, vol) {
    const volume = vol || 0.5;
    this.accessTime = new Date().getTime();
    this.fileName = fileName;
    console.log('trying to play', this.fileName);
    this.dispatcher = this.connection.play(this.fileName, { type: 'opus' });
    this.dispatcher.setVolume(volume);
  }

  _stop() {
    this.dispatcher.end();
    this.dispatcher.destroy();
    this.client.clearInterval(this.clueInterval);
    this.client.clearInterval(this.durationInterval);
  }

  _exit() {
    this.dispatcher.destroy();
  }

  _getScore(cheatMode) {
    let scalar = 1;
    let base = 10;
    if (this.timesPlayedTrack === 1 || this.timesPlayedTrack === 0) {
      this.currentTime = new Date().getTime();
      const elapsed = this.currentTime - this.accessTime;
      const percentage = 100 - Math.floor((elapsed / this.duration) * 100);
      if (percentage > 85) {
        scalar = 1.5;
      } else if (percentage > 75) {
        scalar = 1.4;
      } else if (percentage > 60) {
        scalar = 1.3;
      } else if (percentage > 50) {
        scalar = 1.1;
      }
    }
    if (cheatMode) {
      base += 30;
    }
    return scalar * base;
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
    return (
      user || {
        name: 'Nobody'
      }
    );
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
      this.textChannel.send(message).catch((e) => console.log(e));
    }
  }

  static _getIdFromMsg(msg) {
    return msg.author.id;
  }

  _isAdmin(msg) {
    return Game._getIdFromMsg(msg) === this.admin;
  }
}

export default Game;
