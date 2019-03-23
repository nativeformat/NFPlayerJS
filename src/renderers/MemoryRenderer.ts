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
import { BaseRenderer } from './BaseRenderer';
import { RendererInfo } from './RendererInfo';
import { TimeInstant } from '../time';
import { XAudioBuffer } from '../XAudioBuffer';
import { mixdown, copy } from '../AudioBufferUtils';

const DBG_STR = 'nf:memory-renderer';
const dbg = Debug(DBG_STR);

export class MemoryRenderer extends BaseRenderer {
  constructor(info: RendererInfo, autoRolloff: boolean = true) {
    super(info, autoRolloff);
  }

  // This complicated overload is here purely to allow the user to be very
  // specific and avoid divisions / multiplications which could affect
  // precision of an expected sample count. This is likely only useful in a
  // testing scenario.
  /**
   * Render the specified duration, starting at current renderTime, into an
   * XAudioBuffer. This could give more samples than expected if the
   * quantumSize does not align with the specified sampleCount or duration!
   */
  renderDuration(sampleCount: number): XAudioBuffer;
  renderDuration(duration: TimeInstant): XAudioBuffer;
  renderDuration(durationOrSampleCount: TimeInstant | number): XAudioBuffer {
    const start = Date.now();
    const bufs: XAudioBuffer[] = [];

    const endTime =
      this.samplesElapsed +
      (typeof durationOrSampleCount === 'number'
        ? durationOrSampleCount
        : durationOrSampleCount.asSamples(this.info.sampleRate));

    while (this.samplesElapsed < endTime) {
      const buf = this.render();
      if (buf) {
        bufs.push(buf);
      }
    }

    const length = bufs.length * this.info.quantumSize;
    const output = new XAudioBuffer({
      sampleRate: this.info.sampleRate,
      numberOfChannels: this.info.channelCount,
      length
    });

    const copyStart = Date.now();
    for (let i = 0; i < bufs.length; i++) {
      copy(output, bufs[i], i * this.info.quantumSize);
    }
    const copyEnd = Date.now();
    dbg('appended %d buffers in %dms', bufs.length, copyEnd - copyStart);

    const end = Date.now();
    dbg('rendered %d samples in %dms', length, end - start);

    return output;
  }

  /**
   * Render a single quantum of audio, and return the result.
   * If the player is not `playing`, nothing will be rendered.
   */
  render() {
    if (!this.playing) return;
    const start = Date.now();
    const output = this.renderQuantum();
    const end = Date.now();
    const lastDuration = end - start;
    dbg(
      'sampleIndex %d, stepTime %fms',
      this.samplesElapsed - this.info.quantumSize,
      lastDuration
    );
    return output;
  }
}
