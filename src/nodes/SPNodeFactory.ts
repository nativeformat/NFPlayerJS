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

import {
  Node,
  GainNode as GGainNode,
  LoopNode,
  FileNode,
  StretchNode
} from 'nf-grapher';
import { DirectedScore } from '../DirectedScore';
import { SPNode, NodePlaybackDescription } from './SPNode';
import { SPGainNode } from './SPGainNode';
import { SPFileNode } from './SPFileNode';
import { SPLoopNode } from './SPLoopNode';
import { TimeInstant } from '../time';
import { SPDestinationNode } from './SPDestinationNode';
import { SPPassthroughNode } from './SPPassthroughNode';
import { SPStretchNode } from './SPStretchNode';
import { XAudioBuffer } from '../XAudioBuffer';
import { RendererInfo } from '../renderers/RendererInfo';

// NOTE: IT IS EXTREMELY IMPORTANT that any files outside this folder that
// import anything from this folder, DO SO FROM THIS FILE! Otherwise, an
// impossible inheritance/require cycle is formed.
// Eventually SPGainNode, for example, will be unresolvable due to the parent
// class (SPNode) being undefined because it's waiting on SPNodeFactory,
// which is waiting on all SP*Node impls to do the `extends` mechanics.

export class SPNodeFactory {
  static fromNode(
    node: Node,
    info: RendererInfo,
    dscore: DirectedScore
  ): SPNode {
    switch (node.kind) {
      case GGainNode.PLUGIN_KIND: {
        return new SPGainNode(info, node, dscore);
      }

      case FileNode.PLUGIN_KIND: {
        return new SPFileNode(info, node, dscore);
      }

      case LoopNode.PLUGIN_KIND: {
        return new SPLoopNode(info, node, dscore);
      }

      case StretchNode.PLUGIN_KIND: {
        return new SPStretchNode(info, node, dscore);
      }

      default: {
        console.warn(
          'Unimplemented node: ' +
            node.kind +
            '. Substituting with Passthrough.'
        );
        return new SPPassthroughNode(info, node, dscore);
      }
    }
  }

  static createAncestors(
    forNode: Node,
    info: RendererInfo,
    dscore: DirectedScore
  ) {
    const ancestors: SPNode[] = [];

    if (forNode.kind === SPDestinationNode.KIND) {
      const leaves = dscore.leaves();
      leaves.forEach(node => {
        const ancestor = SPNodeFactory.fromNode(node, info, dscore);
        if (!ancestor) return;
        ancestors.push(ancestor);
      });
    } else {
      const incoming = dscore.incomingEdges(forNode);
      incoming.forEach(edge => {
        const ancestor = dscore.source(edge);
        if (!ancestor) return;
        let mixer = SPNodeFactory.fromNode(ancestor, info, dscore);
        if (mixer !== undefined) {
          ancestors.push(mixer);
        }
      });
    }

    return ancestors;
  }

  static feed(
    ancestors: SPNode[],
    renderTime: TimeInstant,
    buffers: XAudioBuffer[],
    quantumSize: number
  ) {
    for (let i = 0; i < ancestors.length; i++) {
      ancestors[i].feed(renderTime, buffers, quantumSize);
    }
  }

  static getPlaybackDescription(
    ancestors: SPNode[],
    renderTime: TimeInstant,
    descriptions: NodePlaybackDescription[]
  ) {
    for (let i = 0; i < ancestors.length; i++) {
      ancestors[i].getPlaybackDescription(renderTime, descriptions);
    }
  }
}

export {
  SPNode,
  SPFileNode,
  SPGainNode,
  SPLoopNode,
  SPStretchNode,
  SPDestinationNode,
  NodePlaybackDescription
};
