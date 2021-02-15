// eslint-disable-next-line node/no-unpublished-import
import config from './config.json';
import SpotifyWebApi from 'spotify-web-api-node';
import { searchYoutube } from './services/youtube';

class Spotify {
  constructor() {
    this.expiresTime = new Date();
    this.accessTime = new Date();
    this.currentTime = new Date();

    this.spotifyApi = new SpotifyWebApi({
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret
    });

    this.getAccess();
  }

  getAccess() {
    return new Promise((resolve, reject) => {
      // Retrieve an access token.
      this.spotifyApi.clientCredentialsGrant().then(
        (data) => {
          if (data.body && data.body.access_token) {
            this.expiresTime = data.body.expires_in * 500;
            this.accessTime = new Date().getTime();

            // Save the access token so that it's used in future calls
            this.spotifyApi.setAccessToken(data.body.access_token);
            console.log('Spotif token set');
            resolve();
          } else {
            console.log('Something went wrong', data);
            reject();
          }
        },
        (err) => {
          console.log(
            'Something went wrong when retrieving an access token',
            err
          );
          reject();
        }
      );
    });
  }

  _checkTime() {
    this.currentTime = new Date().getTime();
    const elapsed = this.currentTime - this.accessTime;
    if (elapsed + 5000 >= this.expiresTime) {
      return this.getAccess();
    }
    return Promise.resolve();
  }

  async getTracks() {
    await this._checkTime();

    const promises = [];
    const limit = 100;
    for (let i = 0; i <= 800; i += 100) {
      const offset = i;
      promises.push(
        this.spotifyApi.getPlaylistTracks(config.spotify.playlist, {
          offset,
          limit
        })
      );
    }

    try {
      const data = await Promise.all(promises);
      const allSongs = [];
      data.forEach((playlist) => {
        if (playlist && playlist.body && playlist.body.items) {
          const tunes = playlist.body.items
            .map((t) => {
              return {
                source: 'spotify',
                uri: t.track.uri,
                preview: t.track.preview_url,
                id: t.track.id,
                artist: t.track.artists[0].name,
                name: t.track.name,
                duration: t.track.duration_ms
              };
            })
            .filter((t) => t.name);
          allSongs.push(...tunes);
        }
      });
      console.log(`fetched ${allSongs.length} songs`);
      return allSongs;
    } catch (e) {}
  }
}

export default Spotify;
