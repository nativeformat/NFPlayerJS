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

import { MemoryRenderer } from './MemoryRenderer';
import { RendererInfo, XAudioBufferFromInfo } from './RendererInfo';
import { TestRendererInfo } from '../test-utils/TestRendererInfo';
import { Score, FileNode } from 'nf-grapher';
import { TimeInstant } from '../time';
import { ContentCache } from '../ContentCache';

const sum = (arr: Float32Array) => arr.reduce((t, v) => t + v, 0);

test('play/pause fades in/out', async () => {
  const info: RendererInfo = { ...TestRendererInfo };
  const renderer = new MemoryRenderer(info);

  const fBuffer = XAudioBufferFromInfo(info, info.quantumSize * 3);
  fBuffer
    .getChannelData(0)
    .forEach((v, i) => (fBuffer.getChannelData(0)[i] = 1));
  const cache = new ContentCache(undefined, new Map([['test:audio', fBuffer]]));
  renderer.unsafelyReplaceContentCache(cache);

  const s = new Score();
  s.graph.nodes.push(
    FileNode.create({
      file: 'test:audio',
      when: TimeInstant.ZERO.asNanos(),
      duration: TimeInstant.fromSeconds(fBuffer.duration).asNanos(),
      offset: TimeInstant.ZERO.asNanos()
    })
  );

  // Enqueue before playing so an initial enqueue fadeIn is skipped.
  await renderer.enqueueScore(JSON.parse(JSON.stringify(s)));
  renderer.playing = true;
  const fadeIn = renderer.render();
  const steady = renderer.render();
  renderer.playing = false;
  const fadeOut = renderer.render();

  if (!fadeIn || !steady || !fadeOut) throw new Error('Got no audio!');

  const totalFadeIn = sum(fadeIn.getChannelData(0));
  const totalSteady = sum(steady.getChannelData(0));
  const totalFadeOut = sum(fadeOut.getChannelData(0));

  expect(totalFadeIn).toBeGreaterThan(info.quantumSize * 0.8);
  expect(totalFadeIn).toBeLessThan(info.quantumSize - info.quantumSize * 0.1);
  expect(totalSteady).toBe(info.quantumSize);
  expect(totalFadeOut).toBeGreaterThan(info.quantumSize * 0.1);
  expect(totalFadeOut).toBeLessThan(info.quantumSize * 0.8);
});

test('enqueuing a score fades in/out', async () => {
  const info: RendererInfo = { ...TestRendererInfo };
  const renderer = new MemoryRenderer(info);

  const fBuffer = XAudioBufferFromInfo(info, info.quantumSize * 3);
  fBuffer
    .getChannelData(0)
    .forEach((v, i) => (fBuffer.getChannelData(0)[i] = 1));
  const cache = new ContentCache(undefined, new Map([['test:audio', fBuffer]]));
  renderer.unsafelyReplaceContentCache(cache);

  const s = new Score();
  s.graph.nodes.push(
    FileNode.create({
      file: 'test:audio',
      when: TimeInstant.ZERO.asNanos(),
      duration: TimeInstant.fromSeconds(fBuffer.duration).asNanos(),
      offset: TimeInstant.ZERO.asNanos()
    })
  );

  // Start playing immediately to force the score to be rolled-in due to
  // enqueuing, rather than play/pause
  renderer.playing = true;
  await renderer.enqueueScore(JSON.parse(JSON.stringify(s)));
  const fadeIn = renderer.render();
  const steady = renderer.render();
  await renderer.dequeueScore(s.graph.id);
  const fadeOut = renderer.render();

  if (!fadeIn || !steady || !fadeOut) throw new Error('Got no audio!');

  const totalFadeIn = sum(fadeIn.getChannelData(0));
  const totalSteady = sum(steady.getChannelData(0));
  const totalFadeOut = sum(fadeOut.getChannelData(0));

  expect(totalFadeIn).toBeGreaterThan(info.quantumSize * 0.8);
  expect(totalFadeIn).toBeLessThan(info.quantumSize - info.quantumSize * 0.1);
  expect(totalSteady).toBe(info.quantumSize);
  expect(totalFadeOut).toBeGreaterThan(info.quantumSize * 0.1);
  expect(totalFadeOut).toBeLessThan(info.quantumSize * 0.8);
});
