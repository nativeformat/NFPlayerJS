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

import { LoopNode } from 'nf-grapher';
import { TimeInstant } from '../time';
import { SPNode, NodePlaybackDescription } from './SPNode';
import { mixdown, copy } from '../AudioBufferUtils';
import { SPNodeFactory } from './SPNodeFactory';
import { XAudioBuffer } from '../XAudioBuffer';
import { XAudioBufferFromInfo } from '../renderers/RendererInfo';

export class SPLoopNode extends SPNode {
  getPlaybackDescription(
    renderTime: TimeInstant,
    descriptions: NodePlaybackDescription[]
  ) {
    const node = LoopNode.from(this.node);
    const loopDuration = TimeInstant.fromNanos(node.duration);
    const loopWhen = TimeInstant.fromNanos(node.when);

    const loopsSinceStart = renderTime.sub(loopWhen).div(loopDuration);

    let currentLoopStartTime;
    if (loopsSinceStart < 0) {
      currentLoopStartTime = loopWhen;
    } else {
      currentLoopStartTime = loopWhen.add(
        loopDuration.scale(Math.floor(loopsSinceStart))
      );
    }

    const currentLoopEndTime = currentLoopStartTime.add(loopDuration);
    const loopElapsedTime = renderTime.sub(currentLoopStartTime);
    const infinite = node.loopCount === -1;

    // Assume the loop hasn't started yet.
    let ancestorRenderTime: TimeInstant = renderTime;

    if (renderTime.gte(loopWhen) && node.loopCount === -1) {
      // loop is in progress and infinite
      ancestorRenderTime = loopWhen.add(loopElapsedTime);
    } else if (renderTime.gte(loopWhen) && node.loopCount !== -1) {
      // loop is in progress and finite
      const unrolledDuration = loopDuration.scale(node.loopCount);
      const loopEndTime = loopWhen.add(unrolledDuration);

      // c++ player might use the start of the loop time as ancestor time now?
      // Not sure, let's just pass through.
      ancestorRenderTime = renderTime.gte(loopEndTime)
        ? // loop is finished and finite
          renderTime
        : // loop is in progress and finite
          loopWhen.add(loopElapsedTime);
    }

    const desc: NodePlaybackDescription = {
      id: this.node.id,
      kind: this.node.kind,
      time: ancestorRenderTime,

      loop: {
        loopElapsedTime,
        loopsSinceStart,
        currentLoopStartTime,
        currentLoopEndTime,
        infinite
      }
    };

    descriptions.push(desc);

    SPNodeFactory.getPlaybackDescription(
      this.ancestors,
      ancestorRenderTime,
      descriptions
    );
  }

  dilateSampleIndex(sampleIndex: number) {
    const hz = this.info.sampleRate;
    const node = LoopNode.from(this.node);
    const loopDuration = TimeInstant.fromNanos(node.duration);
    const loopWhen = TimeInstant.fromNanos(node.when);

    const startSampleIndex = loopWhen.asSamples(hz);
    const durationSamples = loopDuration.asSamples(hz);

    if (sampleIndex < startSampleIndex) {
      // Loop has not started yet.
      return sampleIndex;
    }

    if (node.loopCount > 0) {
      const loopedSamples = durationSamples * node.loopCount;
      const endSampleIndex = startSampleIndex + loopedSamples;
      if (sampleIndex >= endSampleIndex) {
        // The loop has ended
        const extraSamples = loopedSamples - durationSamples;
        return sampleIndex - extraSamples;
      }
    }

    return (
      ((sampleIndex - startSampleIndex) % durationSamples) + startSampleIndex
    );
  }

  nextSampleCount(sampleIndex: number, sampleCount: number) {
    const hz = this.info.sampleRate;
    const node = LoopNode.from(this.node);
    const loopDuration = TimeInstant.fromNanos(node.duration);
    const loopWhen = TimeInstant.fromNanos(node.when);

    const startSampleIndex = loopWhen.asSamples(hz);
    const durationSamples = loopDuration.asSamples(hz);

    const dilatedSampleIndex = this.dilateSampleIndex(sampleIndex);
    const dilatedEndSampleIndex = dilatedSampleIndex + sampleCount;
    const dilatedEndLoopIndex = startSampleIndex + durationSamples;
    const undilatedEndLoopIndex =
      startSampleIndex + durationSamples * node.loopCount;

    const dilatedStartIndex = this.dilateSampleIndex(startSampleIndex);

    // TOOD: c++ player uses an in_range() function for this to ensure
    // conistent inclusive/exclusive bounds.
    // undilatedEndLoopIndex can be a negative number if node.loopCount is -1
    // which denotes an infinite loop. If so, then we're always in the loop
    // after passing the startSampleIndex.
    const inLoop =
      sampleIndex >= startSampleIndex &&
      (node.loopCount > 0 ? sampleIndex < undilatedEndLoopIndex : true);

    if (inLoop && dilatedEndSampleIndex > dilatedEndLoopIndex) {
      const extraSamples = dilatedEndSampleIndex - dilatedEndLoopIndex;
      const newSampleCount = sampleCount - extraSamples;
      return newSampleCount;
    } else if (
      !inLoop &&
      dilatedStartIndex > sampleIndex &&
      dilatedStartIndex < sampleIndex + sampleCount
    ) {
      // loop starts mid-quantum
      const newSampleCount = dilatedStartIndex - sampleIndex;
      return newSampleCount;
    } else if (inLoop && dilatedEndLoopIndex < dilatedEndSampleIndex) {
      // loop ends mid-quantum
      const newSampleCount = dilatedEndLoopIndex - dilatedSampleIndex;
      return newSampleCount;
    }

    return sampleCount;
  }

  feed(renderTime: TimeInstant, buffers: XAudioBuffer[], sampleCount: number) {
    const hz = this.info.sampleRate;
    const renderTimeSampleIndex = renderTime.asSamples(hz);
    let sampleIndex = renderTimeSampleIndex;
    let receivedSampleCount = 0;

    const outputs: XAudioBuffer[] = [];

    while (receivedSampleCount < sampleCount) {
      let startIndex = sampleIndex;
      let count = this.nextSampleCount(sampleIndex, sampleCount);

      // arguably this should be a case in this.nextSampleCount.
      if (receivedSampleCount + count > sampleCount) {
        count = sampleCount - receivedSampleCount;
      }

      const ancestorRenderTimeSamples = this.dilateSampleIndex(startIndex);
      const ancestorRenderTime = TimeInstant.fromSamples(
        ancestorRenderTimeSamples,
        hz
      );
      const ancestorBuffers: XAudioBuffer[] = [];
      const ancestorFrameSize = count;

      SPNodeFactory.feed(
        this.ancestors,
        ancestorRenderTime,
        ancestorBuffers,
        ancestorFrameSize
      );

      sampleIndex += count;
      receivedSampleCount += count;

      // We might not get anything from ancestors this step, but we still
      // need to track how much silence to stitch possible future buffers.
      const silence = XAudioBufferFromInfo(this.info, ancestorFrameSize);

      const mixed = mixdown(silence, ancestorBuffers);
      outputs.push(mixed);
    }

    const output = XAudioBufferFromInfo(this.info, sampleCount);

    // Stitch the buffers together.
    let startIndex = 0;
    for (let i = 0; i < outputs.length; i++) {
      const source = outputs[i];
      copy(output, source, startIndex);
      startIndex = source.length;
    }

    buffers.push(output);
  }
}
