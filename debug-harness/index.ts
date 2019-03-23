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

import { SmartPlayer, TimeInstant } from '../src/index';
import { StretchNode, FileNode, Score } from 'nf-grapher';

import { default as Sine } from '../fixtures/chirp_linear_5.50.wav';

const s1 = StretchNode.create('s1');
const s2 = StretchNode.create('s2');

s1.stretch.setValueAtTime(0.5, 0);
s2.stretch.setValueAtTime(0.5, 0);

// const g1 = GGainNode.create('g1');
// const g2 = GGainNode.create('g2');

// g1.gain.setValueAtTime(2, 0);
// g2.gain.setValueAtTime(2, 0);

const f1 = FileNode.create(
  {
    file: Sine,
    when: 0,
    duration: TimeInstant.fromSeconds(5.5).asNanos()
  },
  'f1'
);

const edges = [
  f1.connectToTarget(s2),
  s2.connectToTarget(s1)
  // f1.connectToTarget(s1),

  // f1.connectToTarget(g2),
  // g2.connectToTarget(g1)
];

const nodes = [
  s1,
  s2,
  // g1,
  // g2,
  f1
];

let s = new Score();
s.graph.nodes.push(...nodes);
s.graph.edges.push(...edges);

// Ensure they are plain Nodes.
s = JSON.parse(JSON.stringify(s));
console.log(JSON.stringify(s, null, '  '));

const p = new SmartPlayer();

(async function() {
  const ready = await p.enqueueScore(s);
  console.log('ready');
})();

(window as any).p = p;
(window as any).TimeInstant = TimeInstant;
