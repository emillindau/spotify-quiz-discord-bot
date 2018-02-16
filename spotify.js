const SpotifyWebApi = require('spotify-web-api-node');
const config = require('./config.json');

class Spotify {
  constructor() {
    this.expiresTime = new Date();
    this.accessTime = new Date();
    this.currentTime = new Date();

    this.spotifyApi = new SpotifyWebApi({
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret,
    });

    this.getAccess();
  }

  getAccess() {
    return new Promise((resolve, reject) => {
      // Retrieve an access token.
      this.spotifyApi.clientCredentialsGrant()
        .then((data) => {
          if (data.body && data.body.access_token) {
            this.expiresTime = data.body.expires_in * 1000;
            this.accessTime = new Date().getTime();
            console.log('setting expiresTime', this.expiresTime);
            console.log('setting accessTime', this.accessTime);

            // Save the access token so that it's used in future calls
            this.spotifyApi.setAccessToken(data.body.access_token);
            resolve();
          } else {
            console.log('Something went wrong', data);
            reject();
          }
        }, (err) => {
          console.log('Something went wrong when retrieving an access token', err);
          reject();
        });
    });
  }

  _checkTime() {
    this.currentTime = new Date().getTime();
    const elapsed = this.currentTime - this.accessTime;
    if ((elapsed + 5000) >= this.expirestime) {
      console.log('Time expired fetching new');
      return this.getAccess();
    }
    return Promise.resolve();
  }

  _getPlaylistOffset(limit, offset) {
    return new Promise((resolve, reject) => {
      this.spotifyApi.getPlaylistTracks('mctw', config.spotify.playlist, {'offset': offset, 'limit': limit, 'fields': ['items', 'next']}).then((data) => {
        resolve(data.body);
      });
    });
  }

  getTracks() {
    return new Promise((resolve, reject) => {
      this._checkTime()
        .then(() => {
          this.spotifyApi.getPlaylist('mctw', config.spotify.playlist)
            .then((data) => {
              const total = data.body.tracks.total;
              const next = data.body.tracks.next;
              let tunes = data.body.tracks.items.map((t) => ({
                uri: t.track.uri,
                preview: t.track.preview_url,
                id: t.track.id,
                artist: t.track.artists[0].name,
                name: t.track.name,
                duration: t.track.duration_ms,
              })).filter(t => t.preview);

              let offset = 100;
              const maxTimes = 5;
              let run = 0;
              let times = [offset];

              while(offset < total && run < maxTimes) {
                run++;
                const res = 100;
                offset += res;
                times.push(offset);
              }

              Promise.all(times.map(offset => this._getPlaylistOffset(100, offset)))
                .then((res) => {
                  res.forEach(playList => 
                    playList.items.forEach(t => {
                      if(t.track.preview_url) {
                        tunes.push({
                          uri: t.track.uri,
                          preview: t.track.preview_url,
                          id: t.track.id,
                          artist: t.track.artists[0].name,
                          name: t.track.name,
                          duration: t.track.duration_ms,
                        });
                      }
                    })
                  )
                  resolve({ tracks: tunes});
                });
            })
            .catch(e => reject(e));
        })
        .catch(e => console.error(e));
    })
  }
}

module.exports = Spotify;