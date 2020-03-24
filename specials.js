const specials = {};

specials['spotify:track:30Siz55gwE1ceqGqRIennh'] = {
  id: 1,
  uri: 'spotify:track:30Siz55gwE1ceqGqRIennh',
  name: 'Barbie Girl',
  artistName: 'Aqua (Eläkeläiset)',
};

specials['spotify:track:4I9VsBpWQeIXiwPktofNic'] = {
  id: 2,
  uri: 'spotify:track:4I9VsBpWQeIXiwPktofNic',
  name: 'Lemon Tree',
  artistName: 'Fools Garden (Eläkeläiset)',
};

specials['spotify:track:4BAVOuYLpXy5H04frNpjkb'] = {
  id: 3,
  uri: 'spotify:track:4BAVOuYLpXy5H04frNpjkb',
  name: 'Jump',
  artistName: 'Van Halen (Eläkeläiset)',
};

specials['spotify:track:2d0N7LOtJLSqsWvR9sfvb6'] = {
  id: 4,
  uri: 'spotify:track:2d0N7LOtJLSqsWvR9sfvb6',
  name: 'Under the Bridge',
  artistName: 'Red Hot Chili Peppers (Eläkeläiset)',
};

specials['spotify:track:7JouXpETdPRzea03TECn8a'] = {
  id: 5,
  uri: 'spotify:track:7JouXpETdPRzea03TECn8a',
  name: 'I Was Made For Loving You',
  artistName: 'KISS (Eläkeläiset)',
};

specials['spotify:track:6Y7IATo36rN8Xno58zQHCY'] = {
  id: 6,
  uri: 'spotify:track:6Y7IATo36rN8Xno58zQHCY',
  name: 'The Final Countdown',
  artistName: 'Europe (Eläkeläiset)',
};

specials['spotify:track:3HV7KSztajqbJSZViFJaZY'] = {
  id: 7,
  uri: 'spotify:track:3HV7KSztajqbJSZViFJaZY',
  name: 'Smoke on the Water',
  artistName: 'Deep Purple (Eläkeläiset)',
};

specials['spotify:track:1HjQLWnII5HBENOlMtJ5gy'] = {
  id: 8,
  uri: 'spotify:track:1HjQLWnII5HBENOlMtJ5gy',
  name: 'Whiskey In The Jar',
  artistName: 'Metallica (Eläkeläiset)',
};

specials['spotify:track:7ElVB4BcUT8QU5t8AzCTEi'] = {
  id: 9,
  uri: 'spotify:track:7ElVB4BcUT8QU5t8AzCTEi',
  name: 'Beds Are Burning',
  artistName: 'Midnight Oil (Eläkeläiset)',
};

specials['spotify:track:3IUIGD248dFJ9v61zFdCkz'] = {
  id: 10,
  uri: 'spotify:track:3IUIGD248dFJ9v61zFdCkz',
  name: 'Every Breath You Take',
  artistName: 'The Police (Eläkeläiset)',
};

specials['spotify:track:5pbrOVQqniNvQx0viosjcx'] = {
  id: 11,
  uri: 'spotify:track:5pbrOVQqniNvQx0viosjcx',
  name: 'Holy Diver',
  artistName: 'Dio (Eläkeläiset)',
};

specials['spotify:track:7ufP99UZswJxxUFR1IzZ5f'] = {
  id: 12,
  uri: 'spotify:track:7ufP99UZswJxxUFR1IzZ5f',
  name: 'Ace of Spades',
  artistName: 'Motörhead (Eläkeläiset)',
};

specials['spotify:track:7lMjNOGae1tXD2A7VekDuh'] = {
  id: 13,
  uri: 'spotify:track:7lMjNOGae1tXD2A7VekDuh',
  name: 'Viva Las Vegas',
  artistName: 'Elvis Presley (Eläkeläiset)',
};

specials['spotify:track:2Jj5aEVUe9005648PZH30q'] = {
  id: 14,
  uri: 'spotify:track:2Jj5aEVUe9005648PZH30q',
  name: 'Living On A Prayer',
  artistName: 'Bon Jovi (Eläkeläiset)',
};

specials['spotify:track:59fHn8UA323005bZZA7tmF'] = {
  id: 15,
  uri: 'spotify:track:59fHn8UA323005bZZA7tmF',
  name: 'Living In America',
  artistName: 'The Sounds (Eläkeläiset)',
};

specials['spotify:track:5yAyu8kAHfeErLMCycwcba'] = {
  id: 16,
  uri: 'spotify:track:5yAyu8kAHfeErLMCycwcba',
  name: 'Walk Idiot Walk',
  artistName: 'The Hives (Eläkeläiset)',
};

specials['spotify:track:5BeTYkM3IXLQW5CgfWap0P'] = {
  id: 17,
  uri: 'spotify:track:5BeTYkM3IXLQW5CgfWap0P',
  name: 'Like A Virgin',
  artistName: 'Madonna (Eläkeläiset)',
};

specials['spotify:track:5QBvhBn1dWLyonUUvwjiRe'] = {
  id: 18,
  uri: 'spotify:track:5QBvhBn1dWLyonUUvwjiRe',
  name: 'My Favourite Game',
  artistName: 'The Cardigans (Eläkeläiset)',
};

specials['spotify:track:0lJ2CtnLdMYRsdlS8CtO9R'] = {
  id: 19,
  uri: 'spotify:track:0lJ2CtnLdMYRsdlS8CtO9R',
  name: 'Kung Fu Fighting',
  artistName: 'Carl Douglas (Eläkeläiset)',
};

specials['spotify:track:0hO5Y2DTIsALAAxTP70eca'] = {
  id: 20,
  uri: 'spotify:track:0hO5Y2DTIsALAAxTP70eca',
  name: 'Tears In Heaven',
  artistName: 'Eric Clapton (Eläkeläiset)',
};

Object.freeze(specials);

const isSpecial = (uri) => (specials[uri] ? true : false);
const getSpecial = (uri) => specials[uri];

export default isSpecial;
export { getSpecial };
