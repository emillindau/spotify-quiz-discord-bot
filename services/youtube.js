import yts from 'yt-search';

export async function searchYoutube(name) {
  try {
    if (name) {
      const { videos } = await yts(name);
      const [first] = videos;
      return first.url;
    }
  } catch (e) {
    console.log('error from youtube search', e);
  }
  return 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
}
