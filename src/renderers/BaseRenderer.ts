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
  SPDestinationNode,
  SPNode,
  NodePlaybackDescription
} from '../nodes/SPNodeFactory';
import { TimeInstant } from '../time';
import { Mutation, MutationNames, CommandsMutation } from '../Mutations';
import { ContentCache } from '../ContentCache';
import { Score } from 'nf-grapher';
import { DirectedScore } from '../DirectedScore';
import { RendererInfo, XAudioBufferFromInfo } from './RendererInfo';
import { XAudioBuffer } from '../XAudioBuffer';
import { applyFadeIn, applyFadeOut, mixdown } from '../AudioBufferUtils';

import { debug as Debug } from 'debug';
const DBG_STR = 'nf:base-renderer';
const dbg = Debug(DBG_STR);

// Enqueuing a Score means adding a new Destination Node to the renderer.

type QueuedEffect<T> = {
  reject: (err: Error) => void;
  resolve: (value?: any) => void;
  effect: T;
};

export const enum PlayingState {
  STOPPED,
  STARTING,
  PLAYING,
  STOPPING
}

export class BaseRenderer {
  // Minimum is 256 for ScriptProcessorNode!
  static DEFAULT_QUANTUM_SIZE = 8192;

  protected samplesElapsed: number = 0;

  protected contentCache: ContentCache = new ContentCache();
  protected effects: Array<QueuedEffect<Mutation>> = [];
  protected enqueuedScores: Array<{
    destination: SPDestinationNode;
    rolloff: boolean;
  }> = [];
  protected dequeuedScores: Array<{
    id: string;
    rolloff: boolean;
  }> = [];
  protected dnodes: SPDestinationNode[] = [];
  protected playingState = PlayingState.STOPPED;

  constructor(
    public readonly info: RendererInfo,
    protected readonly autoRolloff: boolean = true
  ) {}

  // TODO: does this need a destroy method?
  // destroy () {
  //   if (this.processor) {
  //     this.processor.disconnect(this.ctx.destination);
  //     this.processor.onaudioprocess = null;
  //     this.processor = undefined;
  //   }
  // }

  /**
   * It is only "safe" to call this method if no audio is being rendered.
   */
  async unsafelyReplaceContentCache(nextCache: ContentCache) {
    if (this.playingState !== PlayingState.STOPPED) {
      throw new Error('Cannot replace ContentCache while rendering.');
    }
    this.contentCache = nextCache;
  }

  protected renderQuantum(): XAudioBuffer | undefined {
    if (!this.playing) return;

    this.processEffects();
    const finalDequeuedBuffers = this.processDequeuedScores();

    const buffers: XAudioBuffer[] = [];
    const output = XAudioBufferFromInfo(this.info, this.info.quantumSize);

    const renderTime = TimeInstant.fromSamples(
      this.samplesElapsed,
      this.info.sampleRate
    );
    for (let i = 0; i < this.dnodes.length; i++) {
      const destination = this.dnodes[i];
      destination.feed(renderTime, buffers, this.info.quantumSize);
    }

    const firstEnqueuedBuffers = this.processEnqueuedScores();
    if (finalDequeuedBuffers) buffers.push(...finalDequeuedBuffers);
    if (firstEnqueuedBuffers) buffers.push(...firstEnqueuedBuffers);

    mixdown(output, buffers);

    if (this.playingState === PlayingState.STARTING) {
      if (this.autoRolloff) {
        applyFadeIn(output);
      }

      this.playingState = PlayingState.PLAYING;
    }

    if (this.playingState === PlayingState.STOPPING) {
      if (this.autoRolloff) {
        applyFadeOut(output);
      }

      this.playingState = PlayingState.STOPPED;
    }

    // Even if we stopped this step, we still got this far and therefore still
    // rendered some samples.
    this.samplesElapsed += this.info.quantumSize;

    return output;
  }

  async enqueueScore(score: Score, rolloff = this.autoRolloff): Promise<void> {
    dbg('loading newly enqueued score with id %s', score.graph.id);
    // TODO: need to check if graph id is unique and throw if Not!
    const dscore = new DirectedScore(score);
    const node = new SPDestinationNode(this.info, dscore);
    await node.timeChange(
      this.renderedTime(),
      this.contentCache,
      this.info.quantumSize
    );

    await this.contentCache.scoreContentLoaded(dscore.graphId());

    // We don't want a double rolloff to be performed if we just started
    // playing and enqueued this score immediately.
    const ee = { destination: node, rolloff: this.playing ? rolloff : false };
    this.enqueuedScores.push(ee);
    dbg('enqueued score with id %s', score.graph.id);

    // Immediately process since the audio is irrelevant.
    if (!this.playing) {
      dbg('immediately processing enqueued scores');
      this.processEnqueuedScores();
    }
  }

  async dequeueScore(
    graphId: string,
    rolloff = this.autoRolloff
  ): Promise<void> {
    const ee = { id: graphId, rolloff: this.playing ? rolloff : false };
    this.dequeuedScores.push(ee);
    dbg('dequeued score with id %s', graphId);

    // Immediately process since the render loop won't handle it.
    if (!this.playing) {
      dbg('immediately processing dequeued scores');
      this.processDequeuedScores();
    }
  }

  protected processEnqueuedScores(): XAudioBuffer[] | undefined {
    if (!this.enqueuedScores.length) return;

    let buffers: XAudioBuffer[] = [];
    let renderTime = TimeInstant.fromSamples(
      this.samplesElapsed,
      this.info.sampleRate
    );

    while (this.enqueuedScores.length > 0) {
      const ee = this.enqueuedScores.shift();
      if (!ee) continue;

      if (ee.rolloff) {
        ee.destination.feed(renderTime, buffers, this.info.quantumSize);
        for (let i = 0; i < buffers.length; i++) {
          applyFadeIn(buffers[i]);
        }
      }

      this.dnodes.push(ee.destination);
      dbg('promoted enqueued score with id %s', ee.destination.graphId());
    }

    return buffers;
  }

  // TODO: this should do some sort of lifecycle, recursively. Nothing really uses
  // the lifecycles today, and it would be nice to avoid them all together...
  protected processDequeuedScores(): XAudioBuffer[] | undefined {
    if (!this.dequeuedScores.length) return;

    let buffers: XAudioBuffer[] = [];
    let renderTime = TimeInstant.fromSamples(
      this.samplesElapsed,
      this.info.sampleRate
    );

    while (this.dequeuedScores.length > 0) {
      const ee = this.dequeuedScores.shift();
      if (!ee) continue;

      const graphId = ee.id;
      const idx = this.dnodes.findIndex(node => node.graphId() === graphId);
      if (idx === -1) continue;
      const nodes = this.dnodes.splice(idx, 1);
      if (!nodes.length) continue;
      const node = nodes[0];

      if (ee.rolloff) {
        node.feed(renderTime, buffers, this.info.quantumSize);
        for (let i = 0; i < buffers.length; i++) {
          applyFadeOut(buffers[i]);
        }
      }

      // This is async, but we fire and forget it because processDequeuedScores
      // has to be sync and speedy as part of the render loop.
      node.unmountAncestors();

      dbg('removed dequeued score with id %s', graphId);
    }

    return buffers;
  }

  // TODO: lifecycle!?!?!
  dequeueScores() {
    dbg('dequeuing all scores');
    return Promise.all(
      this.dnodes.map(dnode => this.dequeueScore(dnode.graphId()))
    );
  }

  getScore(graphId: string) {
    const node = this.dnodes.find(node => node.graphId() === graphId);
    if (!node) return;
    return node.dscore;
  }

  getScores() {
    return this.dnodes.map(node => node.dscore);
  }

  renderedTime() {
    return TimeInstant.fromSamples(this.samplesElapsed, this.info.sampleRate);
  }

  public getPlaybackDescription(
    renderTime: TimeInstant
  ): NodePlaybackDescription[] {
    const all: NodePlaybackDescription[] = [];
    this.dnodes.forEach(node => {
      const descs: NodePlaybackDescription[] = [];
      node.getPlaybackDescription(renderTime, descs);

      // Remove the destination node, it shouldn't be exposed.
      descs.shift();
      all.push.apply(all, descs);
    });

    return all;
  }

  async timeChange(renderTime: TimeInstant) {
    this.samplesElapsed = renderTime.asSamples(this.info.sampleRate);
    dbg('timeChange to %d samples requested', this.samplesElapsed);
    const tasks = [];
    for (let i = 0; i < this.dnodes.length; i++) {
      const node = this.dnodes[i];
      const tc = node.timeChange(
        renderTime,
        this.contentCache,
        this.info.quantumSize
      );
      const cc = this.contentCache.scoreContentLoaded(node.graphId());
      // We want both node processing and content loading to happen as quickly
      // as possible.
      tasks.push(tc, cc);
    }
    await Promise.all(tasks);
    dbg('timeChange to %d samples completed', this.samplesElapsed);
  }

  async enqueueEffect(effect: Mutation) {
    const p = new Promise((resolve, reject) => {
      const ee = {
        resolve,
        reject,
        effect
      };

      this.effects.push(ee);
    });

    if (!this.playing) {
      this.processEffects();
    }

    await p;
  }

  protected ancestorsWithId(nodeId: string) {
    const results: SPNode[] = [];
    this.dnodes.forEach(node => {
      results.push(...node.ancestorsWithId(nodeId));
    });
    return results;
  }

  protected commandsEffectTargets(payload: CommandsMutation) {
    const { graphId, nodeId } = payload;
    const candidates: SPDestinationNode[] = [];
    const enqueued = this.enqueuedScores.find(
      es => es.destination.graphId() === graphId
    );
    const running = this.dnodes.find(node => node.graphId() === graphId);

    if (enqueued) candidates.push(enqueued.destination);
    if (running) candidates.push(running);

    // If graph id is not specified, attempt to apply the mutation to all.
    if (!graphId) {
      if (this.enqueuedScores.length) {
        candidates.push(...this.enqueuedScores.map(es => es.destination));
      }
      if (this.dnodes.length) {
        candidates.push(...this.dnodes);
      }
    }

    if (candidates.length === 0) {
      throw new Error(`Graph not found for id ${graphId}`);
    }

    const targets = [];
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      targets.push(...candidate.ancestorsWithId(nodeId));
    }

    return targets;
  }

  protected processEffects() {
    while (this.effects.length > 0) {
      const ee = this.effects.shift();
      if (!ee) continue;
      this.processEffect(ee);
    }
  }

  protected processEffect(ee: QueuedEffect<Mutation>) {
    const effect = ee.effect;
    try {
      switch (effect.name) {
        case MutationNames.PushCommands:
        case MutationNames.ClearCommands: {
          // Type appropriately due to lack of string-enum-to-type-mappings.
          const commandEffect = effect as CommandsMutation;
          const targets = this.commandsEffectTargets(commandEffect);

          dbg('effect %o found targets %o', commandEffect, targets);

          targets.map(target => target.acceptCommandsEffect(commandEffect));
          ee.resolve();
          break;
        }

        default: {
          // The value of the switch condition must be used here for the
          // exhaustive check to work.
          const exhaustive: never = effect.name;
          console.warn(`Unknown Effect: ${effect.name}`);
          ee.reject(new Error('Unknown Effect!'));
        }
      }
    } catch (err) {
      ee.reject(err);
    }
  }

  get playing() {
    return this.playingState !== PlayingState.STOPPED;
  }

  set playing(state: boolean) {
    const prev = this.playingState;
    if (prev === PlayingState.PLAYING && state === false) {
      this.playingState = PlayingState.STOPPING;
    } else if (prev === PlayingState.STOPPED && state === true) {
      this.playingState = PlayingState.STARTING;
    } else if (prev === PlayingState.STARTING && state === false) {
      this.playingState = PlayingState.STOPPED;
    } else if (prev === PlayingState.STOPPING && state === true) {
      this.playingState = PlayingState.STARTING;
    }
  }
}
