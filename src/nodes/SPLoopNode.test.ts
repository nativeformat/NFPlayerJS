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

import { LoopNode, FileNode, Score } from 'nf-grapher';
import { TimeInstant } from '../time';
import { XAudioBuffer } from '../XAudioBuffer';
import { XAudioBufferFromInfo, RendererInfo } from '../renderers/RendererInfo';
import { SmartPlayer } from '../SmartPlayer';
import { MemoryRenderer } from '../renderers/MemoryRenderer';
import { ContentCache } from '../ContentCache';
import { TestRendererInfo } from '../test-utils/TestRendererInfo';
import { expectQuantums } from '../test-utils/ExpectQuantums';
import { loadWave } from '../test-utils/LoadWave';
import { copy } from '../AudioBufferUtils';

function fillBuffer(ab: XAudioBuffer, value: number) {
  for (let i = 0; i < ab.numberOfChannels; i++) {
    const chan = ab.getChannelData(i);
    for (let j = 0; j < chan.length; j++) {
      chan[j] = value;
    }
  }
  return ab;
}

function createScore(source: FileNode, target: LoopNode) {
  const s = new Score();
  s.graph.edges.push(source.connectToTarget(target));
  s.graph.nodes.push(source, target);
  return s;
}

function manualLoop(
  leadingSamples: number,
  data: XAudioBuffer,
  loops: number,
  info: RendererInfo
): XAudioBuffer {
  const rawCount = leadingSamples + data.length;
  const requiredQuantums = Math.floor(rawCount / info.quantumSize);
  const expectedSamples = requiredQuantums * info.quantumSize;
  const looped = XAudioBufferFromInfo(info, expectedSamples);
  for (let i = 0; i < loops; i++) {
    copy(looped, data, leadingSamples + i * data.length, false);
  }
  return looped;
}

const sum = (arr: Float32Array) => arr.reduce((total, v) => total + v);

test('Quantum falls on loop boundary', async () => {
  const info = { ...TestRendererInfo, quantumSize: 410 };
  const renderer = new MemoryRenderer(info, false);
  const player = new SmartPlayer(renderer);

  const fBuffer = fillBuffer(XAudioBufferFromInfo(info, 100), 1);
  const cache = new ContentCache(undefined, new Map([['test:audio', fBuffer]]));
  renderer.unsafelyReplaceContentCache(cache);

  const s = createScore(
    new FileNode(
      '2',
      'test:audio',
      TimeInstant.fromSamples(100, info.sampleRate).asNanos(),
      TimeInstant.fromSamples(100, info.sampleRate).asNanos(),
      TimeInstant.ZERO.asNanos()
    ),
    new LoopNode(
      '1',
      TimeInstant.ZERO.asNanos(),
      TimeInstant.fromSamples(200, info.sampleRate).asNanos(),
      2
    )
  );

  await player.enqueueScore(s);
  player.playing = true;
  const output = renderer.renderDuration(225);
  const chan = output.getChannelData(0);

  expect(sum(chan)).toBe(200);
  expect(sum(chan.subarray(0, 100))).toBe(0);
  expect(sum(chan.subarray(100, 200))).toBe(100);
  expect(sum(chan.subarray(200, 300))).toBe(0);
  expect(sum(chan.subarray(300, 400))).toBe(100);
});

test('Quantum exceeds loop boundary', async () => {
  const info = { ...TestRendererInfo, quantumSize: 410 };
  const renderer = new MemoryRenderer(info, false);
  const player = new SmartPlayer(renderer);

  const fBuffer = fillBuffer(XAudioBufferFromInfo(info, 100), 1);
  const cache = new ContentCache(undefined, new Map([['test:audio', fBuffer]]));
  renderer.unsafelyReplaceContentCache(cache);

  const s = createScore(
    new FileNode(
      '2',
      'test:audio',
      TimeInstant.fromSamples(100, info.sampleRate).asNanos(),
      TimeInstant.fromSamples(100, info.sampleRate).asNanos(),
      TimeInstant.ZERO.asNanos()
    ),
    new LoopNode(
      '1',
      TimeInstant.ZERO.asNanos(),
      TimeInstant.fromSamples(200, info.sampleRate).asNanos(),
      2
    )
  );

  await player.enqueueScore(s);
  player.playing = true;
  const output = renderer.renderDuration(225);

  expect(output).toHaveLength(410);

  const chan = output.getChannelData(0);

  expect(sum(chan.subarray(0, 100))).toBe(0);
  expect(sum(chan.subarray(100, 200))).toBe(100);
  expect(sum(chan.subarray(200, 300))).toBe(0);
  expect(sum(chan.subarray(300, 400))).toBe(100);
  expect(sum(chan.subarray(400, 411))).toBe(0);
});

test('glitchless engagement of the loop node', async () => {
  const info = { ...TestRendererInfo, quantumSize: 75 };
  const renderer = new MemoryRenderer(info, false);
  const player = new SmartPlayer(renderer);

  // Create test audio
  const fBuffer = XAudioBufferFromInfo(info, 800);
  for (let i = 0; i < fBuffer.numberOfChannels; i++) {
    const chan = fBuffer.getChannelData(i);
    for (let j = 0; j < chan.length; j++) {
      if (j >= 0 && j < 100) chan[j] = 0.5;
      if (j >= 100 && j < 200) chan[j] = 1;
      if (j >= 200) chan[j] = 2;
    }
  }

  // Inject test audio to the Player's cache.
  const cache = new ContentCache(undefined, new Map([['test:audio', fBuffer]]));
  renderer.unsafelyReplaceContentCache(cache);

  const s = createScore(
    new FileNode(
      '2',
      'test:audio',
      TimeInstant.fromSamples(0, info.sampleRate).asNanos(),
      TimeInstant.fromSamples(225, info.sampleRate).asNanos(),
      TimeInstant.ZERO.asNanos()
    ),
    new LoopNode(
      '1',
      TimeInstant.fromSamples(100, info.sampleRate).asNanos(),
      TimeInstant.fromSamples(50, info.sampleRate).asNanos(),
      // c++ player is... "off by one" when it comes to loops, so this actually
      // means, 1 + an implicit first loop, I guess.
      1
    )
  );

  await player.enqueueScore(s);
  player.playing = true;
  const output = renderer.renderDuration(225);
  expect(output).toHaveLength(225);

  const chan = output.getChannelData(0);
  expect(sum(chan.subarray(0, 100))).toBe(50);
  expect(sum(chan.subarray(100, 200))).toBe(100);
  expect(sum(chan.subarray(200, 225))).toBe(25 * 2);
});

test('no samples are missed when starting from non-zero', async () => {
  const info = { ...TestRendererInfo, quantumSize: 256 };
  const renderer = new MemoryRenderer(info, false);
  const player = new SmartPlayer(renderer);

  const sineData = await loadWave('./fixtures/sine-440hz-1s.wav');

  // Inject test audio to the Player's cache.
  const cache = new ContentCache(
    undefined,
    new Map([['test:sine440hz1s', sineData]])
  );
  renderer.unsafelyReplaceContentCache(cache);

  const s = createScore(
    new FileNode(
      '2',
      'test:sine440hz1s',
      TimeInstant.fromSeconds(4.5).asNanos(),
      TimeInstant.fromSeconds(1).asNanos(),
      TimeInstant.ZERO.asNanos()
    ),
    new LoopNode(
      '1',
      TimeInstant.fromSeconds(4.5).asNanos(),
      TimeInstant.fromSeconds(1).asNanos(),
      -1
    )
  );

  await player.enqueueScore(s);
  player.playing = true;

  const expected = manualLoop(
    TimeInstant.fromSeconds(4.5).asSamples(info.sampleRate),
    sineData,
    4,
    info
  );

  const received = renderer.renderDuration(expected.length);
  expect(received).toHaveLength(expected.length);

  expectQuantums(received, expected, info.quantumSize);
});

test('no samples are missed when looping a precise loop', async () => {
  const info = { ...TestRendererInfo, quantumSize: 256 };
  const renderer = new MemoryRenderer(info, false);
  const player = new SmartPlayer(renderer);

  const sineData = await loadWave('./fixtures/sine-523.251hz-44079samples.wav');

  // Inject test audio to the Player's cache.
  const cache = new ContentCache(
    undefined,
    new Map([['test:sine440hz1s', sineData]])
  );
  renderer.unsafelyReplaceContentCache(cache);

  const s = createScore(
    new FileNode(
      '2',
      'test:sine440hz1s',
      TimeInstant.fromSeconds(2.5).asNanos(),
      TimeInstant.fromSamples(44079, info.sampleRate).asNanos(),
      TimeInstant.ZERO.asNanos()
    ),
    new LoopNode(
      '1',
      TimeInstant.fromSeconds(2.5).asNanos(),
      TimeInstant.fromSamples(44079, info.sampleRate).asNanos(),
      -1
    )
  );

  await player.enqueueScore(s);
  player.playing = true;

  const expected = manualLoop(
    TimeInstant.fromSeconds(2.5).asSamples(info.sampleRate),
    sineData,
    4,
    info
  );

  const received = renderer.renderDuration(expected.length);
  expect(received).toHaveLength(expected.length);

  expectQuantums(received, expected, info.quantumSize);
});
