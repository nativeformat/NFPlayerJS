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

import * as TNGJSON from '../../fixtures/TNG-Infinite-Idle-Engine.json';
import * as TNGEngines from '../../fixtures/TNG-Crysknife007-16-899-s.wav';
import * as RoxanneShiftedInfinite from '../../fixtures/roxanne-30s-preview-shifted-infinite.json';
import * as RatatatLoop from '../../fixtures/ratatat-loop.json';
import { Score, FileNode } from 'nf-grapher';

type ExampleJSON = { name: string; score: Score };

// Note: The double JSON.stringify/parsing is mostly for TypeScript, so it knows
// that the incoming JSON is actually a Score. It's hard to tell TS that we
// actually have a score.

const examples: ExampleJSON[] = [
  {
    name: "Ratatat forever",
    score: JSON.parse(JSON.stringify(RatatatLoop))
  },
  {
    name: 'Star Trek TNG Infinite Ambient Engine Noise',
    score: JSON.parse(
      JSON.stringify({
        ...TNGJSON,
        graph: {
          ...TNGJSON.graph,
          nodes: TNGJSON.graph.nodes.map(node => {
            if (node.kind === FileNode.PLUGIN_KIND) {
              node.config.file = TNGEngines.default;
            }
            return node;
          })
        }
      })
    )
  },
  {
    name: 'Roxanne, but pitched on every "Roxanne" (infinite JSON version)',
    score: JSON.parse(JSON.stringify(RoxanneShiftedInfinite))
  },
];

export { examples, ExampleJSON };
