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

import { SmartPlayer } from './SmartPlayer';
import {
  Score,
  StretchNode,
  GainNode as GGainNode,
  Graph,
  LoopNode
} from 'nf-grapher';
import { SetValueAtTimeCmd } from './params/ScoreAudioParam';
import { TimeInstant } from './time';
import {
  Mutation,
  PushCommandsMutation,
  ClearCommandsMutation,
  MutationNames
  // RemoveNodesEffectPayload
} from './Mutations';

// Shim the API for testing, globally.
import 'web-audio-test-api';
import { TestAudioContext } from './test-utils/TestAudioContext';
import { ScriptProcessorRenderer } from './renderers/ScriptProcessorRenderer';

test('Apply PushCommandsEffectPayload Effect', async () => {
  const ctx = new AudioContext() as TestAudioContext; // actually the test shim.
  const renderer = new ScriptProcessorRenderer(ctx);
  const p = new SmartPlayer(renderer);
  p.playing = true; // not actually necessary

  const s = new Score();
  const n = StretchNode.create();

  s.graph.nodes.push(n);

  const c: SetValueAtTimeCmd = {
    name: 'setValueAtTime',
    args: {
      value: 1,
      startTime: TimeInstant.fromSeconds(1).asNanos()
    }
  };

  const e: PushCommandsMutation = {
    name: MutationNames.PushCommands,
    nodeId: n.id,
    // TODO: make StretchNode.STRETCH_PARAM a public static property so these names
    // can be used!
    paramName: 'stretch',
    commands: [c]
  };

  // Must await! Otherwise nodes will not be loaded.
  await p.setJson(JSON.stringify(s));
  const result = p.enqueueMutation(e);

  ctx.$processTo('00:01.000');

  await result;
  const uScore: Score = JSON.parse(p.getJson()).pop();
  expect(uScore.graph.nodes[0].params!.stretch[0]).toEqual(c);
});

test('Apply ClearCommandsEffectPayload Effect', async () => {
  const ctx = new AudioContext() as TestAudioContext; // actually the test shim.
  const renderer = new ScriptProcessorRenderer(ctx);
  const p = new SmartPlayer(renderer);
  p.playing = true; // not actually necessary

  const s = new Score();
  const n = StretchNode.create();
  n.stretch.setValueAtTime(1, TimeInstant.fromSeconds(1).asNanos());
  s.graph.nodes.push(n);

  const e: ClearCommandsMutation = {
    name: MutationNames.ClearCommands,
    nodeId: n.id,
    paramName: 'stretch'
  };

  // Must await! Otherwise nodes will not be loaded.
  await p.setJson(JSON.stringify(s));
  const result = p.enqueueMutation(e);

  ctx.$processTo('00:01.000');

  await result;
  const uScore: Score = Score.from(JSON.parse(p.getJson()).pop());
  expect(n.stretch.getCommands()).toHaveLength(1);
  expect(
    (uScore.graph.nodes[0] as StretchNode).stretch.getCommands()
  ).toHaveLength(0);
});

test('Enqueue/Dequeue a running Score', async () => {
  const ctx = new AudioContext() as TestAudioContext; // actually the test shim.
  const renderer = new ScriptProcessorRenderer(ctx);
  const p = new SmartPlayer(renderer);

  const s = new Score();
  const n0 = GGainNode.create();
  s.graph.nodes.push(n0);

  await p.setJson(JSON.stringify(s));

  const prevId = s.graph.id;
  // "Copy" the graph, but generate a new ID
  s.graph = new Graph(undefined, undefined, s.graph.nodes, s.graph.edges);
  const n2 = LoopNode.create({
    loopCount: -1,
    when: 0,
    duration: TimeInstant.fromSeconds(1).asNanos()
  });
  const e1 = n0.connectToTarget(n2);
  s.graph.edges.push(e1);
  s.graph.nodes.push(n2);

  const enqueued = p.enqueueScore(s);
  const dequeued = p.dequeueScore(prevId);

  // Schedule the enqueue/dequeue, then process. Otherwise the internal state
  // will only be kicked once! And Dequeue will never resolve.

  ctx.$processTo('00:01.000');

  await enqueued;
  await dequeued;

  const scores: Score[] = JSON.parse(p.getJson());

  expect(scores).toHaveLength(1);
  expect(scores[0]).toEqual(JSON.parse(JSON.stringify(s)));
});
