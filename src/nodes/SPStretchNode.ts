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
import { Command } from 'nf-grapher';
import { ScoreAudioParam } from '../params/ScoreAudioParam';
import { SPNode, NodePlaybackDescription } from './SPNode';
import { SPNodeFactory } from './SPNodeFactory';
import { mixdown, asInterleaved, asPlanar } from '../AudioBufferUtils';
import { ContentCache } from '../ContentCache';
import { SoundTouch } from 'soundtouch-ts';
import { CommandsMutation, applyMutationToParam } from '../Mutations';
import { debug as Debug } from 'debug';
import { XAudioBuffer } from '../XAudioBuffer';

const DBG_STR = 'nf:stretchnode';
const dbg = Debug(DBG_STR);

// This will never be used, but is purely here to satisfy Term 6b of the
// LGPL2.1: https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html, which
// mandates that the user, at runtime, can use a copy of the software already
// present on their system. This avoids forcing NFPlayerJS and derivative
// software from needing to be licensed under the LGPL2.1.
let SHARED_SOUNDTOUCH_CTOR: typeof SoundTouch;
if (
  typeof global !== 'undefined' &&
  typeof (global as any).SoundTouch !== 'undefined'
) {
  SHARED_SOUNDTOUCH_CTOR = (global as any).SoundTouch;
} else if (
  typeof window !== 'undefined' &&
  typeof (window as any).SoundTouch !== 'undefined'
) {
  SHARED_SOUNDTOUCH_CTOR = (window as any).SoundTouch;
} else {
  SHARED_SOUNDTOUCH_CTOR = SoundTouch;
}

// This is only used to help differentiate debug logs. I don't like it,
// but not sure of a better way without great complication (global id
// store???). Node ids are not checked for uniqueness, since the player
// does not look at ids of either graphs or nodes unless a mutation arrives.
let uniqId = 0;

export class SPStretchNode extends SPNode {
  // TODO: looks like TS Grapher doesn't expose the default/initial values.
  // Also might have to fork PseudoAudioParam and add in default/initial values.
  protected stretchParam = new ScoreAudioParam(1);
  protected pitchRatioParam = new ScoreAudioParam(1);

  protected previousFeedTime: TimeInstant = TimeInstant.ZERO;
  protected requestedAncestorSamples: number = 0;

  protected st: SoundTouch = new SHARED_SOUNDTOUCH_CTOR(this.info.sampleRate);

  // Again, this is only for debug logs!
  protected uniqId = uniqId++;

  async nodeDidMount() {
    this.stretchParam.applyScoreCommands(this.node.params!.stretch);
    this.pitchRatioParam.applyScoreCommands(this.node.params!.pitchRatio);
  }

  async nodeWillUnmount() {
    dbg.enabled &&
      dbg(
        '%s %d unmounting. requestedAncestorSamples %f, previousFeed %f',
        this.node.id,
        this.uniqId,
        this.requestedAncestorSamples,
        this.previousFeedTime.asSamples(this.info.sampleRate)
      );
  }

  async timeChange(
    renderTime: TimeInstant,
    cache: ContentCache,
    quantumSize: number
  ) {
    const stretchValue = this.stretchParam.getValueAtTime(
      renderTime.asSeconds()
    );
    const dilated = renderTime.scale(stretchValue);

    // Short circuiting since these values are not just simple reads.
    dbg.enabled &&
      dbg(
        '%s %d timeChange to %d, dilated %d. prev requested samples %d.',
        this.node.id,
        this.uniqId,
        renderTime.asSamples(this.info.sampleRate),
        dilated.asSamples(this.info.sampleRate),
        this.requestedAncestorSamples
      );

    await super.timeChange(dilated, cache, quantumSize);

    this.previousFeedTime = TimeInstant.from(renderTime);
    this.requestedAncestorSamples = this.estimateRequestedAncestorSamples(
      renderTime,
      quantumSize
    );

    dbg(
      '%s %d new requested samples estimate: %d',
      this.node.id,
      this.uniqId,
      this.requestedAncestorSamples
    );

    // TODO: does this do what I hope it does?
    this.st.clear();
    this.st = new SHARED_SOUNDTOUCH_CTOR(this.info.sampleRate);
  }

  // This is still quite inaccurate, at least audibly. Could be SoundTouch itself,
  // but more likely just need more accurate estimation (verlet integration?).
  estimateRequestedAncestorSamples(
    renderTime: TimeInstant,
    quantumSize: number
  ) {
    const hz = this.info.sampleRate;
    const renderTimeSamples = renderTime.asSamples(hz);

    const frameDuration = TimeInstant.fromSamples(quantumSize, hz);
    let receivedSamples = 0;
    let requiredSamples = 0;

    while (receivedSamples <= renderTimeSamples) {
      const frameStart = TimeInstant.fromSamples(receivedSamples, hz);
      const frameEnd = frameStart.add(frameDuration);
      const seconds = frameStart.asSeconds();
      const frameEndSeconds = frameEnd.asSeconds();

      const startStretchValue = this.stretchParam.getValueAtTime(seconds);
      const endStretchValue = this.stretchParam.getValueAtTime(frameEndSeconds);
      const averageStretchValue = (endStretchValue + startStretchValue) / 2;

      const startPitchValue = this.pitchRatioParam.getValueAtTime(seconds);
      const endPitchValue = this.pitchRatioParam.getValueAtTime(
        frameEndSeconds
      );
      const avgPitchValue = (endPitchValue + startPitchValue) / 2;

      // https://github.com/kirbysayshi/soundtouch-ts/blob/d0c8ddd8ee78e25c0c278870188c5cec72cb2063/src/index.ts#L842-L854
      const stVirtualPitch = avgPitchValue;
      const stVirtualTempo = 1 / averageStretchValue; // inverse, compared to Scores!
      const stVirtualRate = 1; // This is not exposed in Scores, specific to ST.

      const stTempo = stVirtualTempo / stVirtualPitch;
      const stRate = stVirtualRate * stVirtualPitch;

      // https://www.surina.net/soundtouch/faq.html#sample_processing
      // Number_of_output_samples = Number_of_input_samples / (tempo_change * rate_change)
      // Algebra...
      // num_output_samples * (tempo_change * rate_change) = num_input_samples
      const inputSamples = quantumSize * stTempo * stRate;
      requiredSamples += inputSamples;
      receivedSamples += quantumSize;
    }

    return requiredSamples;
  }

  getPlaybackDescription(
    renderTime: TimeInstant,
    descriptions: NodePlaybackDescription[]
  ) {
    const ancestorRenderTime = TimeInstant.fromSamples(
      this.requestedAncestorSamples,
      this.info.sampleRate
    );

    const desc: NodePlaybackDescription = {
      id: this.node.id,
      kind: this.node.kind,
      time: ancestorRenderTime
    };

    descriptions.push(desc);

    SPNodeFactory.getPlaybackDescription(
      this.ancestors,
      ancestorRenderTime,
      descriptions
    );
  }

  feed(renderTime: TimeInstant, buffers: XAudioBuffer[], sampleCount: number) {
    const hz = this.info.sampleRate;
    const seconds = renderTime.asSeconds();

    const frameDuration = TimeInstant.fromSamples(sampleCount, hz);
    const frameEnd = renderTime.add(frameDuration);
    const frameEndSeconds = frameEnd.asSeconds();

    // Stretch factor is hard here, I guess just average it given the sample window?
    const startStretchValue = this.stretchParam.getValueAtTime(seconds);
    const endStretchValue = this.stretchParam.getValueAtTime(frameEndSeconds);
    const averageStretchValue = (endStretchValue + startStretchValue) / 2;

    // Average the pitch factor too.
    const startPitchValue = this.pitchRatioParam.getValueAtTime(seconds);
    const endPitchValue = this.pitchRatioParam.getValueAtTime(frameEndSeconds);
    const averagePitchValue = (endPitchValue + startPitchValue) / 2;

    // Have to use samples to avoid floating point precision.
    const renderTimeSamples = renderTime.asSamples(hz);
    const previousFeedTimeSamples = this.previousFeedTime.asSamples(hz);

    if (renderTimeSamples < previousFeedTimeSamples) {
      const hz = this.info.sampleRate;
      const prevFeed = this.previousFeedTime;

      // We have gone back in time! We need to reset in order to request the
      // right time from our ancestors.
      this.requestedAncestorSamples = this.estimateRequestedAncestorSamples(
        renderTime,
        sampleCount
      );

      // Short circuiting since these values are not just simple reads.
      dbg.enabled &&
        dbg(
          '%s %d prev feed time (%f) was _after_ current feed time (%f). ' +
            'Estimating prev feed as %f and requested samples as %f',
          this.node.id,
          this.uniqId,
          prevFeed.asSamples(hz),
          renderTime.asSamples(hz),
          this.previousFeedTime.asSamples(hz),
          this.requestedAncestorSamples
        );

      // Also need to reset the time stretcher to avoid drifting over multiple
      // loops (especially infinite).
      this.st.clear();
      dbg(
        '%s %d reset ancestor samples to %f',
        this.node.id,
        this.uniqId,
        this.requestedAncestorSamples
      );
    }

    // NOTE:
    // stretch of 0.5 means "play the audio in 1/2 the time"
    // pitch of 2 means "play the audio at 2x the pitch/frequency"

    // Unfortunately, this SoundTouch port is hard coded to two channels.
    // We need to account for this in all puts/requests to/from SoundTouch.
    const CHANNEL_COUNT = 2;

    // NOTE: This port of SoundTouch does not allow for configuring of
    // processing windows or durations!

    // SoundTouch uses Interleaved buffers, so we cannot use AudioBuffers.
    const output = new Float32Array(sampleCount * CHANNEL_COUNT);

    // TODO: can probably apply both at a more granular level, if we request
    // a smaller number of frames from SoundTouch.
    this.st.pitch = averagePitchValue;
    // soundtouch uses the inverse.
    this.st.tempo = 1 / averageStretchValue;

    // These include _all_ channels
    let receivedSamples = 0;
    const requiredSampleCount = sampleCount * CHANNEL_COUNT;

    // SoundTouch uses Interleaved buffers, so we cannot use AudioBuffers'
    // implicit notion of length == a single channel.
    while (receivedSamples < requiredSampleCount) {
      this.st.process();

      // SoundTouch considers a "frame" a pair of samples for LR channels.
      // Calling them iFrames here to differentiate between other plugins that
      // consider a "frame" the current sample rendering window.
      const queuedIFrames = this.st.outputBuffer.frameCount;
      const iFrameCount = sampleCount / CHANNEL_COUNT;
      const receiver = output.subarray(receivedSamples);

      // This ST assumes two channels, always, and does math internally
      // to expand the numbers. Need to halve what we request because of it.
      const requestedFrameCount = Math.min(
        Math.floor(iFrameCount),
        Math.floor(receiver.length / CHANNEL_COUNT)
      );
      this.st.outputBuffer.receiveSamples(receiver, requestedFrameCount);
      const remainingIFrames = this.st.outputBuffer.frameCount;
      const receivedThisStep =
        (queuedIFrames - remainingIFrames) * CHANNEL_COUNT;
      receivedSamples += receivedThisStep;

      if (receivedThisStep > 0) {
        // We might have enough, so spin the loop to check again.
        continue;
      }

      // Got nothing, so request from ancestors and inject!
      const ancestorScratch = new XAudioBuffer({
        numberOfChannels: CHANNEL_COUNT,
        length: sampleCount,
        sampleRate: hz
      });
      const frameStartSamples = this.requestedAncestorSamples;
      const ancestorBuffers: XAudioBuffer[] = [];
      SPNodeFactory.feed(
        this.ancestors,
        TimeInstant.fromSamples(frameStartSamples, hz),
        ancestorBuffers,
        sampleCount
      );

      mixdown(ancestorScratch, ancestorBuffers);
      this.requestedAncestorSamples += sampleCount;

      const interleaved = asInterleaved(ancestorScratch);
      this.st.inputBuffer.putSamples(interleaved);
    }

    const planar = asPlanar(output, this.info.sampleRate, CHANNEL_COUNT);
    buffers.push(planar);
    this.previousFeedTime = TimeInstant.from(renderTime);
  }

  acceptCommandsEffect(effect: CommandsMutation) {
    const { paramName } = effect;

    let param: ScoreAudioParam | null = null;
    let gparam: Command[] | null = null;
    switch (paramName) {
      case 'stretch': {
        param = this.stretchParam;
        gparam = this.node.params!.stretch;
        break;
      }

      case 'pitchRatio': {
        param = this.pitchRatioParam;
        gparam = this.node.params!.pitchRatio;
        break;
      }

      case 'formantRatio': {
        gparam = this.node.params!.formantRatio;
        break;
      }
    }

    if (!param || !gparam) {
      throw new Error(`Unknown or Unimplemented Param with name ${paramName}`);
    }

    return applyMutationToParam(effect, param, gparam);
  }
}
