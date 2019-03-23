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
import { GainNode as GGainNode } from 'nf-grapher';
import { ScoreAudioParam } from '../params/ScoreAudioParam';
import { SPNode } from './SPNode';
import { SPNodeFactory } from './SPNodeFactory';
import { CommandsMutation, applyMutationToParam } from '../Mutations';

import { debug as Debug } from 'debug';
import { XAudioBuffer } from '../XAudioBuffer';

const DBG_STR = 'nf:gainnode';
const dbg = Debug(DBG_STR);

export class SPGainNode extends SPNode {
  // TODO: looks like TS Grapher doesn't expose the default/initial values.
  // Also might have to fork PseudoAudioParam and add in default/initial values.
  protected gainParam = new ScoreAudioParam(1);

  // This avoids constructor argument chaining
  async nodeDidMount() {
    // const node = this.node as GGainNode;
    this.gainParam.applyScoreCommands(this.node.params!.gain);
  }

  // TODO: Probably will eventually need a "node grapher data changed" lifecycle method.

  feed(renderTime: TimeInstant, buffers: XAudioBuffer[], sampleCount: number) {
    const seconds = renderTime.asSeconds();

    dbg('%s feed @ %f', this.node.id, seconds);

    const ancestorBuffers: XAudioBuffer[] = [];
    SPNodeFactory.feed(
      this.ancestors,
      renderTime,
      ancestorBuffers,
      sampleCount
    );

    for (let buffer of ancestorBuffers) {
      const incr = 1 / buffer.sampleRate;
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const chan = buffer.getChannelData(c);
        for (let i = 0; i < chan.length; i++) {
          const sampleTime = seconds + incr * i;
          const pvalue = this.gainParam.getValueAtTime(sampleTime);
          chan[i] *= pvalue;
        }
      }
    }

    for (let buffer of ancestorBuffers) {
      buffers.push(buffer);
    }
  }

  acceptCommandsEffect(effect: CommandsMutation) {
    const node = GGainNode.from(this.node);
    const { paramName } = effect;

    if (!Object.keys(node.getParams()).includes(paramName)) {
      throw new Error(
        `GainNode does not contain param with name: ${paramName}`
      );
    }

    return applyMutationToParam(effect, this.gainParam, this.node.params!.gain);
  }
}
