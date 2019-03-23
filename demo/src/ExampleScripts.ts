/*
 * Copyright (c) 2018-Present, Spotify AB.
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as NFPlayer from '../../src/';
import * as NFGrapher from 'nf-grapher';
import { SmartPlayer } from '../../src/';
import * as TNGEngines from '../../fixtures/TNG-Crysknife007-16-899-s.wav';

// Returns a promise since a type cannot use the `async` keyword.
// export type PlaygroundScript = (
//   player: SmartPlayer,
//   GrapherExports: typeof NFGrapher,
//   PlayerExports: typeof NFPlayer,
// ) => void;

export type PlaygroundScript = string;

export type CompiledPlaygroundScript = (
  player: SmartPlayer,
  GrapherExports: typeof NFGrapher,
  PlayerExports: typeof NFPlayer
) => Promise<void>;

export type ExampleScript = {
  name: string;
  script: PlaygroundScript;
};

const examplePreamble = ``;

export const examples: ExampleScript[] = [
  {
    name: 'Star Trek TNG Infinite Ambient Engine Noise (scripted)',
    script: `
      const filePath = '${TNGEngines.default}';

      // These Globals are provided by this playground, and act as imported namespaces
      // A player instance is also provided as "p"
      const { TimeInstant } = NFPlayer;
      const { Score, FileNode, GainNode, LoopNode } = NFGrapher;

      // This is complicated to get the math right! In this diagram,
      // | indicates the start or end time of a node
      // ) indicates a fade out
      // ( indicates a fade in
      // |-| indicates an arbitrary unit of time

      // file1    |(   )|
      // file2        |(   )|
      // loop1    |       |
      // loop2      |       |
      // timeline |-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|
      //         t0

      // The overlap below is used to position the start/end times of each file,
      // which is relatively independent of the fades. The loops are of length:
      // (file duration - overlap) * 2
      // The second loop starts at t0 + overlap.
      // The first file starts at t0. the second file starts at:
      // file duration - overlap

      // Some AudioParam commands cannot handle a zero due to math. So this allows
      // "near enough" to zero to be imperceptible / negligible.
      const AUDIBLE_ZERO = 0.0001;

      // We're using two file nodes, but only one unique file.
      const offset = TimeInstant.fromSeconds(0);
      const duration = TimeInstant.fromSeconds(16.899);

      // These tend to sound even as long as fade is 1/2 of loop overlap duration.
      // How much the two file nodes should overlap during their crossfade.
      const overlap = TimeInstant.fromSeconds(0.6);
      // How long the actual fading operation should last.
      const fade = TimeInstant.fromSeconds(0.3);

      const f1 = FileNode.create({
        // Buy this track!
        // https://cheesynirvosa.bandcamp.com/track/star-trek-tng-ambient-engine-noise
        // Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)
        // https://creativecommons.org/licenses/by-sa/3.0/
        file: filePath,
        when: TimeInstant.ZERO.asNanos(),
        duration: duration.asNanos(),
        offset: offset.asNanos(),
      });

      const g1 = GainNode.create();
      g1.gain.setValueAtTime(0, 0);
      g1.gain.setValueAtTime(AUDIBLE_ZERO, 0.0001);
      g1.gain.exponentialRampToValueAtTime(1, fade.asNanos());
      g1.gain.setValueAtTime(1, duration.sub(fade).asNanos());
      g1.gain.exponentialRampToValueAtTime(AUDIBLE_ZERO, duration.asNanos());

      const l1 = LoopNode.create({
        when: TimeInstant.ZERO.asNanos(),
        duration: duration.sub(overlap).add(duration).sub(overlap).asNanos(),
        loopCount: -1, // infinite
      })

      // The second file node begins playing just before the first node ends.
      const f2When = duration.sub(overlap);

      const f2 = FileNode.create({
        // Buy this track!
        // https://cheesynirvosa.bandcamp.com/track/star-trek-tng-ambient-engine-noise
        // Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)
        // https://creativecommons.org/licenses/by-sa/3.0/
        file: filePath,
        when: f2When.asNanos(),
        duration: duration.asNanos(),
        offset: offset.asNanos(),
      });

      const g2 = GainNode.create();
      g2.gain.setValueAtTime(0, 0);
      g2.gain.setValueAtTime(AUDIBLE_ZERO, f2When.asNanos());
      g2.gain.exponentialRampToValueAtTime(1, f2When.add(fade).asNanos());
      g2.gain.setValueAtTime(1, f2When.add(duration.sub(fade)).asNanos())
      g2.gain.exponentialRampToValueAtTime(AUDIBLE_ZERO, f2When.add(duration).asNanos());

      const l2 = LoopNode.create({
        when: overlap.asNanos(),
        duration: duration.sub(overlap).add(duration).sub(overlap).asNanos(),
        loopCount: -1, // infinite
      })

      const edges = [
        f1.connectToTarget(g1),
        f2.connectToTarget(g2),
        g1.connectToTarget(l1),
        g2.connectToTarget(l2),
      ]

      const nodes = [
        f1, f2, g1, g2, l1, l2
      ];

      let s = new Score()
      s.graph.nodes.push(...nodes);
      s.graph.edges.push(...edges);

      await p.enqueueScore(s);
      p.playing = true;
    `
  },
  {
    name:
      'Roxanne, but pitched on every "Roxanne"  (infinite scripted version)',
    script: `
      // These Globals are provided by this playground, and act as imported namespaces
      // A player instance is also provided as "p"
      const { TimeInstant } = NFPlayer;
      const { Score, FileNode, LoopNode, StretchNode } = NFGrapher;
      const loopWhen = TimeInstant.fromSeconds(9.593);
      const loopDuration = TimeInstant.fromSeconds(26.908).sub(loopWhen);

      // https://github.com/spotify/NFGrapher/blob/master/doc/smartplayer.md#loop
      const loop = LoopNode.create({
        when: loopWhen.asNanos(),
        duration: loopDuration.asNanos(),
        loopCount: -1,
      });

      // https://github.com/spotify/NFGrapher/blob/master/doc/smartplayer.md#file
      const file = FileNode.create({
        // Roxanne: spotify:track:0SYRVn2YF7HBscQEmlkpTI via Spotify MP3 Audio Preview
        file: 'https://p.scdn.co/mp3-preview/6975d56d8fb372f33a9b6414899fa9c5bc4cb8e1?cid=774b29d4f13844c495f206cafdad9c86',
        when: TimeInstant.ZERO.asNanos(),
        offset: TimeInstant.fromSeconds(0).asNanos(),
        // When looped, a file node needs it's duration + the length of at least
        // one complete loop. Otherwise it will not provide samples to the loop node!
        duration: TimeInstant.fromSeconds(30).add(loopDuration).asNanos()
      });

      const HALF_STEP_RATIO = Math.pow(2, 1 / 12);

      // https://github.com/spotify/NFGrapher/blob/master/doc/smartplayer.md#stretch
      const stretch = StretchNode.create();
      stretch.pitchRatio.setValueAtTime(1, 0);
      stretch.pitchRatio.setValueAtTime(Math.pow(HALF_STEP_RATIO, 1), TimeInstant.fromSeconds(2.574).asNanos());
      stretch.pitchRatio.setValueAtTime(Math.pow(HALF_STEP_RATIO, 2), TimeInstant.fromSeconds(9.554).asNanos());
      stretch.pitchRatio.setValueAtTime(Math.pow(HALF_STEP_RATIO, 3), TimeInstant.fromSeconds(13.064).asNanos());
      stretch.pitchRatio.setValueAtTime(Math.pow(HALF_STEP_RATIO, 4), TimeInstant.fromSeconds(16.535).asNanos());
      stretch.pitchRatio.setValueAtTime(Math.pow(HALF_STEP_RATIO, 5), TimeInstant.fromSeconds(20.006).asNanos());
      stretch.pitchRatio.setValueAtTime(Math.pow(HALF_STEP_RATIO, 6), TimeInstant.fromSeconds(23.476).asNanos());

      const s = new Score();
      s.graph.nodes.push(file, stretch, loop);
      s.graph.edges.push(
        file.connectToTarget(stretch),
        stretch.connectToTarget(loop),
      );

      // Enqueue the score, which will cause the player to begin loading
      // the files.
      await p.enqueueScore(s);

      // Start rendering, aka allow p.renderTime to progress.
      p.playing = true;
    `
  },
  {
    name: 'Load and play seconds 10 through 20 of a single file',
    script: `
      // These Globals are provided by this playground, and act as imported namespaces
      // A player instance is also provided as "p"
      const { TimeInstant } = NFPlayer;
      const { Score, FileNode } = NFGrapher;

      // https://github.com/spotify/NFGrapher/blob/master/doc/smartplayer.md#file
      const f = FileNode.create({
        // Roxanne: spotify:track:0SYRVn2YF7HBscQEmlkpTI via Spotify MP3 Audio Preview
        file: 'https://p.scdn.co/mp3-preview/6975d56d8fb372f33a9b6414899fa9c5bc4cb8e1?cid=774b29d4f13844c495f206cafdad9c86',
        when: TimeInstant.ZERO.asNanos(),
        offset: TimeInstant.fromSeconds(20).asNanos(),
        duration: TimeInstant.fromSeconds(10).asNanos()
      });

      const s = new Score();
      s.graph.nodes.push(f);

      // Enqueue the score, which will cause the player to begin loading
      // the files.
      await p.enqueueScore(s);

      // Start rendering, aka allow p.renderTime to progress.
      p.playing = true;
    `
  },
  {
    name:
      'Play the first 10 seconds of a file, then loop a single 4 beat bar forever.',
    script: `
      // These Globals are provided by this playground, and act as imported namespaces
      // A player instance is also provided as "p"
      const { TimeInstant } = NFPlayer;
      const { Score, FileNode, LoopNode } = NFGrapher;

      const f = FileNode.create({
        // Roxanne: spotify:track:0SYRVn2YF7HBscQEmlkpTI via Spotify MP3 Audio Preview
        file: 'https://p.scdn.co/mp3-preview/6975d56d8fb372f33a9b6414899fa9c5bc4cb8e1?cid=774b29d4f13844c495f206cafdad9c86',
        when: TimeInstant.ZERO.asNanos(),
        // Duration needs to include time for at least one complete loop,
        // so this is 14.25s instead of 10s
        duration: TimeInstant.fromSeconds(14.25).asNanos(),
      });

      const l = LoopNode.create({
        when: TimeInstant.fromSeconds(10.044).asNanos(),
        duration: TimeInstant.fromSeconds(3.456).asNanos(),
        loopCount: -1,
      })

      const s = new Score();
      s.graph.nodes.push(f);
      s.graph.nodes.push(l);

      // Make sure you register the edges with the score!
      s.graph.edges.push(f.connectToTarget(l));

      await p.enqueueScore(s);
      p.playing = true;
    `
  },
  {
    name: 'Play a track, then quickly fade out on user interaction',
    script: `
      // These Globals are provided by this playground, and act as imported namespaces
      // A player instance is also provided as "p"
      const { TimeInstant, MutationNames } = NFPlayer;
      const { Score, GainNode, FileNode } = NFGrapher;

      const f = FileNode.create({
        // Roxanne: spotify:track:0SYRVn2YF7HBscQEmlkpTI via Spotify MP3 Audio Preview
        file: 'https://p.scdn.co/mp3-preview/6975d56d8fb372f33a9b6414899fa9c5bc4cb8e1?cid=774b29d4f13844c495f206cafdad9c86',
        when: TimeInstant.ZERO.asNanos(),
        duration: TimeInstant.fromSeconds(30).asNanos()
      });

      const g = GainNode.create()

      const s = new Score();
      s.graph.nodes.push(f);
      s.graph.nodes.push(g);

      s.graph.edges.push(f.connectToTarget(g));

      await p.enqueueScore(s);
      p.playing = true;

      // Pretend this is a click handler. This playground is imperfect, so
      // setting a real listener wouldn't behave well across multiple evals.
      // document.addEventListener('click', () => {
      setTimeout(() => {
        // Enqueuing a mutation to the graph means that this mutation
        // will be applied in the next render quantum of the player.
        // The "mutation" is actually adding a new command to the Score,
        // and commands have their own notion of scheduling, just like the
        // Web Audio API.
        p.enqueueMutation({
          name: MutationNames.PushCommands,
          nodeId: g.id,
          paramName: 'gain',
          commands: [
            {
              name: 'setValueAtTime',
              args: {
                value: 1,
                startTime: p.renderTime.asNanos()
              }
            } as NFPlayer.SetValueAtTimeCmd,
            {
              name: 'linearRampToValueAtTime',
              args: {
                value: 0,
                endTime: p.renderTime.add(TimeInstant.fromSeconds(1)).asNanos(),
              }
            } as NFPlayer.LinearRampToValueAtTimeCmd,
          ]
        } as NFPlayer.PushCommandsMutation);
      }, 5000);
    `
  },
  {
    name:
      'Loop and Pitch Shift a track, then swap it with a modified score on User Interaction',
    script: `
      // These Globals are provided by this playground, and act as imported namespaces
      // A player instance is also provided as "p"
      const { TimeInstant, MutationNames } = NFPlayer;
      const { Score, GainNode, FileNode, StretchNode, LoopNode, Graph } = NFGrapher;

      // The duration of our loop.
      const duration = TimeInstant.fromSeconds(22.063270000000003);

      const f1 = FileNode.create({
        // Mad World: spotify:track:77xZaHf3YSiSAllj4aI7ih
        file: 'https://p.scdn.co/mp3-preview/fd9318346f36c7e235a664ceef791b0f2743b399?cid=774b29d4f13844c495f206cafdad9c86',
        when: TimeInstant.ZERO.asNanos(),
        duration: duration.asNanos(),
      });

      const l1 = LoopNode.create({
        when: TimeInstant.ZERO.asNanos(),
        duration: duration.asNanos(),
        loopCount: -1, // infinite
      })

      const s1 = StretchNode.create();
      s1.pitchRatio.setValueAtTime(1, 0);

      const s = new Score();
      s.graph.nodes.push(f1, s1, l1);

      s.graph.edges.push(
        f1.connectToTarget(l1),
        l1.connectToTarget(s1),
      );

      await p.enqueueScore(s);
      p.playing = true;

      // Pretend this is a user click, instead of a setTimeout
      setTimeout(async () => {

        // Grab the current renderTime for relative calculations later.
        const now = p.renderTime;

        // We _could_ pull the running Score JSON out of the player, and
        // modify it, but we happen to have it above.
        // The player copies all Scores it is given, so it's safe to modify
        // our copy defined above.

        // Stash this to later deactivate the current Score.
        const runningId = s.graph.id;

        // IDs can be any string, but default to UUIDs. To generate a new one
        // "easily", we create a new graph from the existing one. This is SUPER
        // clunky right now but will hopefully get easier in the future. Another
        // option is to simply change the id to a new, user-defined string :D
        s.graph = new Graph(undefined, s.graph.loadingPolicy, s.graph.nodes, s.graph.edges);
        // Alternative:
        // s.id = s.id + '-arbitrary-string';

        const s2 = StretchNode.create();
        // Give ourselves a base value to start with.
        s2.stretch.setValueAtTime(1, now.add(TimeInstant.fromSeconds(1)).asNanos());
        // Make the effect begin 1 second from now.
        s2.stretch.setTargetAtTime(2, now.add(TimeInstant.fromSeconds(1)).asNanos(), 0.99);

        s.graph.nodes.push(s2);
        s.graph.edges.push(s1.connectToTarget(s2));

        // Remember, the Score, Nodes, Edges, etc above are not "live". The only
        // relation they have to the running score is that they may share IDs. This
        // is OK since the player only cares about unique Graph IDs, mostly.
        await p.enqueueScore(s);

        // The modified Score _should_ seamlessly handle playback, because
        // everything is already cached and loaded. So it's safe to dequeue the
        // old score as soon as possible. Having both scores in the player is fine,
        // but both will be processed and output to the speaker!
        p.dequeueScore(runningId);

      }, 15000);
    `
  },
  {
    name:
      'Pitchshift a piano down, with a voice over the top. 30 seconds in slow both down (derail!).',
    script: `
      // These Globals are provided by this playground, and act as imported namespaces
      // A player instance is also provided as "p"
      const { TimeInstant, MutationNames } = NFPlayer;
      const { Score, GainNode, FileNode, StretchNode, LoopNode } = NFGrapher;

      const f1 = FileNode.create({
        // Mad World: spotify:track:77xZaHf3YSiSAllj4aI7ih
        file: 'https://p.scdn.co/mp3-preview/fd9318346f36c7e235a664ceef791b0f2743b399?cid=774b29d4f13844c495f206cafdad9c86',
        when: TimeInstant.ZERO.asNanos(),
        duration: TimeInstant.fromSeconds(30).asNanos(),
      });

      const l1 = LoopNode.create({
        when: TimeInstant.ZERO.asNanos(),
        duration: TimeInstant.fromSeconds(22.063270000000003).asNanos(),
        loopCount: -1, // infinite
      })

      const f2 = FileNode.create({
        // Shatner, War of the Worlds spotify:track:55fyDzZJVj3EAnV81RAjlT
        file: 'https://p.scdn.co/mp3-preview/7434b8a84b6fbe68558cfd8565762b0f4688ec75?cid=774b29d4f13844c495f206cafdad9c86',
        when: TimeInstant.ZERO.asNanos(),
        duration: TimeInstant.fromSeconds(30).asNanos()
      });

      const g2 = GainNode.create();
      g2.gain.setValueAtTime(1.5, 0);

      const s1 = StretchNode.create();
      s1.pitchRatio.setValueAtTime(0.5, 0);
      s1.pitchRatio.setTargetAtTime(0.4, TimeInstant.fromSeconds(28).asNanos(), 0.99999999);

      const s2 = StretchNode.create();
      s2.stretch.setTargetAtTime(2, TimeInstant.fromSeconds(30).asNanos(), 0.9999999999);

      const s = new Score();
      s.graph.nodes.push(f1, f2, g2, s1, s2, l1);

      s.graph.edges.push(
        f1.connectToTarget(l1),

        // pitch shift the first loop
        l1.connectToTarget(s1),

        // stretch the tempo of the first file (included pitch change).
        s1.connectToTarget(s2),

        // Stretch the tempo of the second file too, after applying some gain.
        f2.connectToTarget(g2),
        g2.connectToTarget(s2),
      );

      await p.enqueueScore(s);
      p.playing = true;
    `
  }
];
