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

import { debug as Debug } from 'debug';
import { BaseRenderer, PlayingState } from './BaseRenderer';
import { XAudioBuffer } from '../XAudioBuffer';
import { TimeInstant } from '../time';
import { mixdownToAudioBuffer } from '../AudioBufferUtils';
import { XAudioContext } from '../WebAudioContext';

const DBG_STR = 'nf:script-processor-renderer';
const dbg = Debug(DBG_STR);

export class ScriptProcessorRenderer extends BaseRenderer {
  private processor?: ScriptProcessorNode;

  constructor(
    private ctx: AudioContext = XAudioContext(),
    quantumSize: number = BaseRenderer.DEFAULT_QUANTUM_SIZE,
    autoRolloff: boolean = true
  ) {
    super(
      {
        channelCount: ctx.destination.channelCount,
        sampleRate: ctx.sampleRate,
        // ScriptProcessorNode only accepts 0 - 16384.
        quantumSize: Math.min(Math.max(quantumSize, 0), 16384),
        decode: (uri, ab: ArrayBuffer) =>
          new Promise<XAudioBuffer>((resolve, reject) => {
            dbg('decoding file %s', uri);
            // Using the callback form of decodeAudioData due to Safari, which often
            // does not emit an actual Error object, and does not track rejected
            // promises well, either.
            ctx.decodeAudioData(
              ab,
              buffer => {
                dbg('decoded file %s with length %d', uri, buffer.length);
                resolve(XAudioBuffer.fromAudioBuffer(buffer));
              },
              err => {
                // err is often `null` in safari.
                dbg('failed to decode file %s, %s', uri, err && err.message);
                reject(err);
              }
            );
          })
      },
      autoRolloff
    );

    this.processor = this.ctx.createScriptProcessor(this.info.quantumSize);
    this.processor.onaudioprocess = evt => {
      const start = window.performance.now();

      // WHY IS THIS NECESSARY!?!?! Without this, the output buffer
      // comes in with non-zero samples!!! WHYYYY
      // Blank out the damn output.
      for (let i = 0; i < evt.outputBuffer.numberOfChannels; i++) {
        const destChan = evt.outputBuffer.getChannelData(i);
        for (let s = 0; s < destChan.length; s++) {
          destChan[s] = 0;
        }
      }

      const buffer = this.renderQuantum();
      if (buffer) {
        mixdownToAudioBuffer(evt.outputBuffer, [buffer]);
      }

      if (!this.playing) return;

      if (dbg.enabled) {
        const end = window.performance.now();
        const lastDuration = end - start;

        // Note: Firefox appears to not adjust playbackTime using the processor
        // buffer size

        console.log(
          'sampleIndex',
          this.samplesElapsed - this.info.quantumSize,
          'processor duration',
          lastDuration + 'ms',
          'budget remaining',
          TimeInstant.fromSeconds(evt.playbackTime)
            .sub(TimeInstant.fromSeconds(this.ctx.currentTime))
            .asMillis() + 'ms'
        );
      }
    };
    this.processor.connect(this.ctx.destination);
  }

  get playing() {
    // We override the `playing` setter, so we need a getter.
    // ES2015 classes do not link accessors if one is overridden.
    return super.playing;
  }

  set playing(state: boolean) {
    // Attempt to resume in the case that the player was instantiated
    // at page load (or another situation where user-interaction would not
    // unlock the context/audio playback).
    // The real solution is to always assume the developer only creates a
    // player as a result of direct user input (or injects an AudioContext
    // that was the result thereof).
    // Of course, this hack assumes that setting `playing` is a result of
    // direct user input!
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    super.playing = !!state;
  }
}
