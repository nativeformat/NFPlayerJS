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

import { FileNode, Score, StretchNode } from 'nf-grapher';
import { TimeInstant } from '../time';
import { XAudioBufferFromInfo } from '../renderers/RendererInfo';
import { SmartPlayer } from '../SmartPlayer';
import { MemoryRenderer } from '../renderers/MemoryRenderer';
import { ContentCache } from '../ContentCache';
import { TestRendererInfo } from '../test-utils/TestRendererInfo';

test('Seeking produces equivalent audio at 1x stretch', async () => {
  const info = { ...TestRendererInfo, quantumSize: 400 };
  const input = XAudioBufferFromInfo(info, info.quantumSize * 4);
  const chan = input.getChannelData(0);
  // Fill the audio with known transition points.
  for (let i = 0; i < chan.length; i++) {
    chan[i] =
      i < chan.length * 0.25
        ? -1
        : i < chan.length * 0.5
        ? -0.5
        : i < chan.length * 0.75
        ? 0.5
        : 1;
  }

  const renderer = new MemoryRenderer(info, false);
  const player = new SmartPlayer(renderer);
  const cache = new ContentCache(undefined, new Map([['test:audio', input]]));
  renderer.unsafelyReplaceContentCache(cache);

  const f = FileNode.create({
    when: 0,
    duration: TimeInstant.fromSamples(input.length, info.sampleRate).asNanos(),
    file: 'test:audio'
  });
  const s = StretchNode.create();

  const score = new Score();
  score.graph.edges.push(f.connectToTarget(s));
  score.graph.nodes.push(f, s);

  await player.enqueueScore(score);
  player.playing = true;
  const output1 = renderer.renderDuration(input.length);

  // Set false then kick to ensure all scores are dequeued and that the true
  // playing state === 'STOPPED' instead of 'STOPPING'. This is wonky, I
  // wish there were another way.
  player.playing = false;
  renderer.render();

  await player.dequeueScore(score.graph.id);
  await player.enqueueScore(score);
  await player.seek(TimeInstant.fromSamples(input.length / 2, info.sampleRate));
  player.playing = true;
  const output2 = renderer.renderDuration(input.length / 2);

  // Verify the lengths.
  expect(output1).toHaveLength(input.length);
  expect(output2).toHaveLength(input.length / 2);

  // SoundTouch "primes" by starting at zero and ramping up to the actual
  // sample, eventually. (Looks like a setTargetAtTime). So we cannot directly
  // compare buffers. Instead, pick a known transition point and compare
  // the surrounding values.
  const midpoint = output2.length / 2;
  const midpointStart = midpoint - 5;
  const midpointEnd = midpoint + 5;

  const subOutput1 = output1
    .getChannelData(0)
    .subarray(input.length / 2)
    .subarray(midpointStart, midpointEnd);
  const subOutput2 = output2
    .getChannelData(0)
    .subarray(midpointStart, midpointEnd);

  expect(subOutput1).toEqual(subOutput2);
});

test('Seeking produces equivalent audio at 2x stretch', async () => {
  const info = { ...TestRendererInfo, quantumSize: 8192 };
  const input = XAudioBufferFromInfo(info, info.quantumSize * 8);
  const chan = input.getChannelData(0);
  // Fill the audio with known transition points.
  for (let i = 0; i < chan.length; i++) {
    chan[i] =
      i < chan.length * 0.25
        ? -1
        : i < chan.length * 0.5
        ? -0.5
        : i < chan.length * 0.75
        ? 0.5
        : 1;
  }

  const renderer = new MemoryRenderer(info, false);
  const player = new SmartPlayer(renderer);
  const cache = new ContentCache(undefined, new Map([['test:audio', input]]));
  renderer.unsafelyReplaceContentCache(cache);

  const f = FileNode.create({
    when: 0,
    duration: TimeInstant.fromSamples(input.length, info.sampleRate).asNanos(),
    file: 'test:audio'
  });
  const s = StretchNode.create();
  s.stretch.setValueAtTime(2, TimeInstant.ZERO.asNanos());

  const score = new Score();
  score.graph.edges.push(f.connectToTarget(s));
  score.graph.nodes.push(f, s);

  await player.enqueueScore(score);
  player.playing = true;

  const maxDuration = input.length * 2;
  const boundaries = maxDuration / 4;

  const output1 = renderer.renderDuration(maxDuration);

  // Set false then kick to ensure all scores are dequeued and that the true
  // playing state === 'STOPPED' instead of 'STOPPING'. This is wonky, I
  // wish there were another way.
  player.playing = false;
  renderer.render();

  await player.dequeueScore(score.graph.id);
  await player.enqueueScore(score);

  await player.seek(TimeInstant.fromSamples(maxDuration / 2, info.sampleRate));
  player.playing = true;
  const output2 = renderer.renderDuration(maxDuration / 2);

  // Verify the lengths.
  expect(output1).toHaveLength(maxDuration);
  expect(output2).toHaveLength(maxDuration / 2);

  // SoundTouch "primes" by starting at zero and ramping up to the actual
  // sample, eventually. (Looks like a setTargetAtTime). So we cannot directly
  // compare buffers. Instead, pick a known transition point and compare
  // the surrounding values.
  const midpoint = output2.length / 2;
  const midpointStart = midpoint - 10;
  const midpointEnd = midpoint + 10;

  const subOutput1 = output1
    .getChannelData(0)
    .subarray(maxDuration / 2)
    .subarray(midpointStart, midpointEnd);
  const subOutput2 = output2
    .getChannelData(0)
    .subarray(midpointStart, midpointEnd);

  expect(subOutput1).toEqual(subOutput2);
});
