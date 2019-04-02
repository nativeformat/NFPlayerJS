<p style="text-align: center;" align="center">
  <!-- Using an absolute URL here for the generated documentation -->
  <img alt="NFPlayerJS" src="https://github.com/spotify/NFPlayerJS/raw/master/NFPlayerJS.png" width="400" />
</p>

[![License](https://img.shields.io/github/license/spotify/NFPlayerJS.svg)](LICENSE)
[![Spotify FOSS Slack](https://slackin.spotify.com/badge.svg)](https://slackin.spotify.com)
[![Readme Score](http://readme-score-api.herokuapp.com/score.svg?url=https://github.com/spotify/NFPlayerJS)](http://clayallsopp.github.io/readme-score?url=https://github.com/spotify/NFPlayerJS)

A JavaScript/TypeScript audio engine for the Web and Server capable of multitrack time stretching, pitch shifting, declarative effects, faster than realtime processing, and more!

# Getting Started (Browser) 🚀

1. Install the player: `npm install --save nf-player`
2. Describe your audio experience using [NFGrapher][nfgrapher] `npm install --save nf-grapher`, or use a prebuilt [JSON Score](./fixtures).
3. Listen to it!

```js
// In a browser, probably webpack-powered...
import { SmartPlayer, TimeInstant } from 'nf-player';
import * as ScoreJSON from './your-score.json';

(async function() {
  // Create player. By default it uses Web Audio to insert audio data into
  // the current audio device.
  const p = new SmartPlayer();

  // Load the score and referenced audio files.
  await p.enqueueScore(ScoreJSON);

  // Play! `renderTime` will now proceed to increase.
  p.playing = true;

  // You can instantly seek if you want.
  p.renderTime = TimeInstant.fromSeconds(30);
})();
```

For more demos, check out the [Playground][playground], which contains a live-coding environment, sample code, and sample JSON Scores, all in your browser!

There are also in-progress [API Docs][api docs].

# Getting Started (CLI) 🚀🚀

A [CLI](./src/cli.ts) also ships with this package!

```sh
$ npx nf-player save --duration 120 --input-file ./fixtures/roxanne-30s-preview-shifted-infinite.json --output-file ./roxanne.wav
```

The above command will load the Score JSON, download the audio files, and render 120 seconds of audio to a file called `tng.wav`. This should happen in about 5 seconds of realtime, depending on your computer and internet connection.

The CLI depends on [ffmpeg](https://ffmpeg.org/) being present in `$PATH` for file decoding. On a mac this can be accomplished using [homebrew](https://brew.sh/) `brew install ffmpeg`

# Raison D'être :thought_balloon:

Given a way to [describe arbitrary audio experiences over time][nfgrapher], we needed a player to play them. This repo serves as a reference implementation of the patterns required to process a Grapher Score, as well as a testbed for new features and API design.

Due to the nature of Grapher Scores, this player is capable of playback experiences that are generally outside the realm of a standard "track based" audio player, such as Winamp, Spotify, or VLC, and closer to an audio game engine. These include:

- infinite playback (never ending loops, infinite-jukebox-style)
- evolving or generative playback (subtle changes over time, procedurally generated changes)
- adaptive playback (user input, such as location)

By providing a unifying, declarative format to describe these experiences (and with a matching player implementation), they can be shared by multiple platforms, such as apps on your phone, websites, or physical devices. This is notably different from device or platform specific APIs like the Web Audio API, Core Audio, or Windows Audio Graphs, which often require imperative coding using programming languages specific to each. Composable time stretching, for example, is not possible without abandoning most (if not all) of the ergonomics of the Web Audio API.

# Architecture :triangular_ruler:

A Grapher Score describes, basically, an audio processing graph, where each node of the graph is either a producer of audio, a consumer, or both, in the case of transformation. The edges of the graph control where the audio "flows".

<p style="text-align: center;" align="center">
<a target="_blank" href="charts/Audio Graph.png"><img src="charts/Audio Graph.png" alt="A chart displaying an Audio Graph, showing a file node connected to a gain node connected to a stretch node connected to a destination node, and another file node connected to a gain node connected to a loop node connected to the same stretch node." /></a>
</p>

This is basically the same as the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), except instead of an imperative creation of the graph by the programmer, building it up piece by piece, a Grapher Score is a complete declarative description of the graph, including all the nodes, edges, and changes in values over time (Audio Parameter Commands). It can be de/serialized from/to JSON, and can be thought of as a [JSON description of what to load, play, and change over time](./fixtures/TNG-Infinite-Idle-Engine.json). It is given to the Player whole, and processed as a whole. Changes are described as _Mutations_ to the Score, which are currently limted to adding and removing scheduled audio parameter changes. Multiple scores can be loaded, processed, and played by the Player, which allows for seamless switching between scores, and therefore seamless audio playback.

<p style="text-align: center;" align="center">
<a target="_blank" href="charts/Enqueuing Scores.png"><img src="charts/Enqueuing Scores.png" alt="A chart showing that the user can enqueue a Score in the player, receive feedback when it's loaded, and then later enqueue a copy of the score with a slight modification to produce a seamless audio transition." width="600" /></a>
</p>

Once given to the Player, a Grapher Score is traversed, recursively, each render quantum (default is 8192 samples, ~0.185 seconds). Each node/plugin requests samples for the current quantum from its ancestors in the graph, passing its own notion of the current render time, which could be dilated due to time stretching or shifted due to looping. Each node/plugin applies whatever processing it wants by reading the config and audio params of the node for the current time, then forwards the resulting samples. All the buffers are then mixed down and written using the Web Audio API (or in the case of a CLI, a chunk of a WAV file).

<p style="text-align: center;" align="center">
<a target="_blank" href="charts/Score Time Processing.png"><img alt="A chart that shows how each node requests samples from its ancestor in the graph until it has enouch samples to fulfill the request from its ancestor." src="charts/Score Time Processing.png" width="600" /></a>
</p>

Passing and modifying the current notion of time, recursively through ancestors, is what sets this player apart from other players built on top of APIs like Web Audio: a Stretch node, for example, can affect time for an entire subgraph, requiring that subgraph to be rendered much faster than realtime. This is extremely powerful (an entire graph could be audibly "sped up" like fast forwarding a tape cassette) but requires this processing model.

It should also be noted that all "leaves" of the Grapher Score are implicitly connected to the [(internal) output node](/src/nodes/SPDestinationNode.ts). Therefore, many Scores look like discontiguous graphs.

# Basic Capabilities 🎧

- Supported [Grapher Score Nodes](https://github.com/spotify/NFGrapher/blob/master/doc/smartplayer.md):
  - Stretch (pitchshifting and timestretching, provided by a TS port of [SoundTouch](https://github.com/kirbysayshi/soundtouch-ts))
  - Loop
  - Gain (volume)
  - File ([`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)-able urls only)
- Seeking
- Processing audio faster than realtime with [reasonable](#fn-reasonable) performance
- Realtime mutations of the current Score
- Loading / Processing / Playing multiple Scores

# Limitations 🤖

- Loads all audio files into memory all at once using [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) / [decodeAudioData][]
- Only supports whatever audio formats the platform supports (due to using [decodeAudioData][]). The CLI shells out to ffmpeg to avoid this limitation.
- No DRM / EME support (the EME API does not provide faster-than-realtime access to the audio samples)
- Does all processing on the main thread (but with fairly low CPU usage). This could be mitigated by running the entire player in a Web Worker or, eventually, Audio Worklet.

[decodeaudiodata]: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData

# Capabilities by Example 🏃‍♀️🏃‍♂️

See the [Playground][playground]!

# Development 🏗

Clone this repo, then:

```sh
$ npm install
```

To build the library and start the development environment:

```sh
$ npm start
```

To build and publish the demo to [gh-pages](playground) manually, run:

```sh
$ npm run deploy:demo:manual
```

Otherwise the demo is actually built and deployed on each push to master.

There is also a more cut-down [debug environment](./debug-harness/index.ts) useful for debugging / developing single Scores or scripts:

```sh
$ npm run debug-harness
```

# Deployment / Publishing / Release 🚢

### Publishing:

- `npm version [major|minor|patch]`, then PR.
- TravisCI will attempt to publish any tagged commit.

### Demo Deployment:

- The demo is deployed automatically on master builds using the TravisCI gh-pages provider.

# Contributing 💖⌨️

This project adheres to the [Open Code of Conduct](https://github.com/spotify/code-of-conduct/blob/master/code-of-conduct.md). By participating, you are expected to honor this code.

# License 👩‍⚖️

[Apache 2.0](./LICENSE)

## Acknowledgements

NFPlayerJS depends on [SoundTouch-TS](https://github.com/kirbysayshi/soundtouch-ts) which is licensed under the [GNU Lesser General Public Library, version 2.1](https://www.gnu.org/licenses/lgpl-2.1.en.html).

To comply with section 6 of the LGPL, SoundTouch can be swapped out at runtime by any user by placing an API-compatible replacement at `window.SoundTouch` or `global.SoundTouch`.

[music player by SBTS from the Noun Project](https://thenounproject.com/search/?q=cassete&i=1394525).

# Notes 📝

<b id="fn-reasonable"></b> "Reasonable" is ambiguous, of course. In this case, it means "expected CPU usage if audio is the primary purpose of the experience". For example, an authoring tool or enhanced listening experience. It's still unclear to if CPU usage is low enough for a background task like listening to a playlist.

[nfgrapher]: https://github.com/spotify/NFGrapher
[playground]: https://spotify.github.io/NFPlayerJS/
[api docs]: https://spotify.github.io/NFPlayerJS/docs/
