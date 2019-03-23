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

import { TimeInstant } from '../time';
import { Node } from 'nf-grapher';
import { SPNode } from './SPNode';
import { DirectedScore } from '../DirectedScore';
import { RendererInfo } from '../renderers/RendererInfo';

export class SPDestinationNode extends SPNode {
  // HACK: just to help things be consistent.
  static KIND = 'com.nativeformat.plugin.destination';

  public node: Node;
  // public playing: boolean;
  // private processor?: ScriptProcessorNode;
  // private bufferSize: number;
  // private samplesElapsed: number;

  // private effects: Array<EnqueuedEffect>;
  public readonly dscore: DirectedScore;

  constructor(info: RendererInfo, dscore: DirectedScore) {
    const destination = {
      id: 'destination',
      kind: SPDestinationNode.KIND
    };
    super(info, destination, dscore);
    this.node = destination;
    this.dscore = dscore;
  }

  graphId() {
    return this.dscore.graphId();
  }
}
