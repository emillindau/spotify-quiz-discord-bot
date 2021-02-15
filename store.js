import redis from 'redis';
import { promisify } from 'util';

const rClient = redis.createClient();

rClient.on('error', (err) => console.log('Redis error', err));

const getAsync = promisify(rClient.hget).bind(rClient);

const ratingCalc = (user) => {
  const { points, timesPlayed, firstPlaces, avgScorePerQuestion } = user;

  let percentage = 0;
  if (firstPlaces !== 0 && timesPlayed !== 0) {
    if (firstPlaces === timesPlayed) {
      percentage = 100;
    } else if (firstPlaces === 0) {
      percentage = 0;
    } else {
      const p = (firstPlaces / timesPlayed) * 100;
      const result = (p / 100).toFixed(2);
      percentage = 100 * result;
    }
  }
  percentage = 1 * percentage === 0 ? 1 : percentage * 1;
  const pr = (100 + percentage) / 100;
  const scalar = (100 + avgScorePerQuestion) / 100 + pr;
  const res = (points / timesPlayed) * scalar;
  return res.toFixed(2);
};

export const clearAll = () => {
  return new Promise((resolve, reject) => {
    rClient.hkeys('names', (err, replies) => {
      if (err) {
        reject(err);
      }
      if (replies && replies.length > 0) {
        replies.forEach((reply) => rClient.del(reply));
        rClient.del('names');
      }
      resolve();
    });
  });
};

export const saveResult = async (users, noOfQuestions) => {
  if (users.size > 0) {
    let sortedUsers = [];
    users.forEach((u) => sortedUsers.push(u));
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
        rClient.hset(
          u.name,
          'scorePerQuestion',
          Math.floor(Number(u.points) / noOfQuestions)
        );
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

export const getAllPlayers = () =>
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
            name: name.slice(0, 10),
            rating,
            points: Number(points),
            timesPlayed: Number(timesPlayed),
            firstPlaces: Number(firstPlaces),
            avgScorePerQuestion: Number(avgScorePerQuestion),
          };
        });

        Promise.all(players).then((p) => resolve(p));
      } else {
        resolve([]);
      }
    });
  });

export default rClient;
