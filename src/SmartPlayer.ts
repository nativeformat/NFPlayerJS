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

import { TimeInstant } from './time';
import { Score } from 'nf-grapher';
import { Mutation } from './Mutations';
import { NodePlaybackDescription } from './nodes/SPNodeFactory';
import { BaseRenderer } from './renderers/BaseRenderer';
import { ScriptProcessorRenderer } from './renderers/ScriptProcessorRenderer';

export { NodePlaybackDescription };

export class SmartPlayer {
  constructor(private renderer: BaseRenderer = new ScriptProcessorRenderer()) {}

  async setJson(json: string) {
    await this.renderer.dequeueScores();
    await this.enqueueScore(json);
    if (this.renderTime.neq(TimeInstant.ZERO)) {
      // Only reset render time if something has already been started.
      // SetJSON is the user halting current ops and starting over.
      // The conditional is here because enqueueScore calls a local timeChange
      // using the current renderTime from the renderer.
      await this.renderer.timeChange(TimeInstant.ZERO);
    }
  }

  getJson(graphId?: string) {
    if (!graphId) {
      return JSON.stringify(this.renderer.getScores());
    }
    const score = this.renderer.getScore(graphId);
    return JSON.stringify(score);
  }

  get playing() {
    return this.renderer.playing;
  }

  set playing(state: boolean) {
    this.renderer.playing = !!state;
  }

  get renderTime(): TimeInstant {
    return this.renderer.renderedTime();
  }

  /** @deprecated */
  set renderTime(time: TimeInstant) {
    this.renderer.timeChange(time);
  }

  /**
   * Set renderTime to `time`. Seeking / setting renderTime is actually
   * an asynchronous process since the internal graph must be destroyed and
   * rebuilt, and potentially new content loaded. `seek` allows a user to
   * await the operation, unlike set/get `renderTime`.
   */
  seek(time: TimeInstant): Promise<void> {
    return this.renderer.timeChange(time);
  }

  public getPlaybackDescription(
    renderTime: TimeInstant
  ): NodePlaybackDescription[] {
    return this.renderer.getPlaybackDescription(renderTime);
  }

  public async enqueueMutation(effect: Mutation) {
    return this.renderer.enqueueEffect(effect);
  }

  public enqueueScore(score: string, fadeIn?: boolean): Promise<void>;
  public enqueueScore(score: Score, fadeIn?: boolean): Promise<void>;
  public enqueueScore(
    scoreOrJSON: string | Score,
    fadeIn: boolean = true
  ): Promise<void> {
    // Do not preparse into TypedNodes! They're too restrictive.
    // Score.from() creates TypedNodes.

    let score: Score;
    if (typeof scoreOrJSON === 'string') {
      score = JSON.parse(scoreOrJSON);
    } else {
      // It might have TypedNode(s) in it. So we must make them plain
      // by going to JSON and back. Could ducktype each node by checking
      // for various TypedNode-only properties, but that is much more error-
      // prone than JSON and back.
      score = JSON.parse(JSON.stringify(scoreOrJSON));
    }

    return this.renderer.enqueueScore(score, fadeIn);
  }

  public dequeueScore(graphId: string, fadeOut: boolean = true) {
    return this.renderer.dequeueScore(graphId, fadeOut);
  }

  public dequeueScores() {
    return this.renderer.dequeueScores();
  }
}
