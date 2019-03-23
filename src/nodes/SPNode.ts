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
import { DirectedScore } from '../DirectedScore';
import { SPNodeFactory } from './SPNodeFactory';
import { ContentCache } from '../ContentCache';
import { CommandsMutation } from '../Mutations';
import { XAudioBuffer } from '../XAudioBuffer';
import { RendererInfo } from '../renderers/RendererInfo';

export type NodePlaybackDescription = {
  id: string;
  kind: string;
  // The renderTime the node used to request samples from its ancestors.
  // For example, the dilated stretch time the stretch node passed to the
  // nodes it pulled samples from.
  time: TimeInstant;

  // It's a grab bag!

  // File Node
  file?: {
    maxDuration: TimeInstant;
  };

  // Loop Node
  loop?: {
    loopsSinceStart: number;
    currentLoopStartTime: TimeInstant;
    currentLoopEndTime: TimeInstant;
    loopElapsedTime: TimeInstant;
    infinite: boolean;
  };
};

export abstract class SPNode {
  public ancestors: SPNode[] = [];
  constructor(
    protected info: RendererInfo,
    public readonly node: Node,
    protected dscore: DirectedScore
  ) {}

  feed(renderTime: TimeInstant, buffers: XAudioBuffer[], quantumSize: number) {
    for (let i = 0; i < this.ancestors.length; i++) {
      this.ancestors[i].feed(renderTime, buffers, quantumSize);
    }
  }

  // Multiple ancestors could have the same id, if there is a diamond in the graph.
  // For example: A -> B, A -> C. Both B and C will have an instance of A
  // in their ancestor list, and each instance will have the same node id.
  ancestorsWithId(nodeId: string): SPNode[] {
    let result: SPNode[] = [];
    this.ancestors.forEach(ancestor => {
      if (ancestor.node.id === nodeId) {
        result.push(ancestor);
        return;
      }

      const ancestorResult = ancestor.ancestorsWithId(nodeId);
      if (ancestorResult) {
        result.push(...ancestorResult);
      }
    });

    return result;
  }

  async unmountAncestors() {
    return Promise.all(this.ancestors.map(node => node.nodeWillUnmount()));
  }

  async timeChange(
    renderTime: TimeInstant,
    cache: ContentCache,
    quantumSize: number
  ): Promise<void> {
    // Tell everyone they're about to be destroyed
    await this.unmountAncestors();

    this.ancestors = SPNodeFactory.createAncestors(
      this.node,
      this.info,
      this.dscore
    );

    // Tell everyone to load themselves given the renderTime
    await Promise.all(
      this.ancestors.map(node =>
        node.timeChange(renderTime, cache, quantumSize)
      )
    );

    // Tell this node it has been mounted and its ancestors are in place.
    await this.nodeDidMount();
  }

  getPlaybackDescription(
    renderTime: TimeInstant,
    descriptions: NodePlaybackDescription[]
  ) {
    descriptions.push({
      id: this.node.id,
      kind: this.node.kind,
      time: renderTime
    });

    SPNodeFactory.getPlaybackDescription(
      this.ancestors,
      renderTime,
      descriptions
    );
  }

  async nodeDidMount(): Promise<void | undefined> {}
  async nodeWillUnmount(): Promise<void | undefined> {}

  acceptCommandsEffect(effect: CommandsMutation) {
    throw new Error(`${this.node.kind} has no params to accept commands.`);
  }
  // abstract async acceptNodesEffect(
  //   effect: SmartPlayerEffect<NodesEffectPayload>
  // ): Promise<SmartPlayerEffect<NodesEffectPayload>>;
}
