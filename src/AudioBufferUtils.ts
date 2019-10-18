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

import { XAudioBuffer } from './XAudioBuffer';

// TODO: allow buffers to be a single buffer to prevent extra array creations.
export function mixdown(
  dest: XAudioBuffer,
  buffers: XAudioBuffer[]
): XAudioBuffer {
  if (buffers.length === 0) {
    return dest;
  }

  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    for (let c = 0; c < dest.numberOfChannels; c++) {
      // copy either the matching or first source channel to the destination
      // (this means a mono source will be converted to stereo)
      const sourceIdx = c < buffer.numberOfChannels ? c : 0;
      const sourceChan = buffer.getChannelData(sourceIdx);
      const destChan = dest.getChannelData(c);
      for (let s = 0; s < sourceChan.length; s++) {
        destChan[s] = destChan[s] + sourceChan[s];
      }
    }
  }

  return dest;
}

export function mixdownToAudioBuffer(
  dest: AudioBuffer,
  buffers: XAudioBuffer[]
): AudioBuffer {
  return mixdown(dest as XAudioBuffer, buffers);
}

/**
 * Copy the src to the dst. If the src has fewer channels than the dst, the
 * last src channel is used. If the dst has fewer channels than the src,
 * the other src channels are not used.
 */
export function copy(
  dst: XAudioBuffer,
  src: XAudioBuffer,
  startInDestination: number,
  boundsCheck: boolean = true
) {
  if (boundsCheck && dst.length - startInDestination < src.length) {
    throw new Error(
      'InvalidSourceSize: The Source must fit within destination.'
    );
  }
  for (let i = 0; i < dst.numberOfChannels; i++) {
    if (i < src.numberOfChannels) {
      dst.copyToChannel(src.getChannelData(i), i, startInDestination);
    } else {
      dst.copyToChannel(
        src.getChannelData(src.numberOfChannels - 1),
        i,
        startInDestination
      );
    }
  }
  return dst;
}

export function zeroOut(dest: XAudioBuffer) {
  // Mix each sample by averaging.
  for (let i = 0; i < dest.numberOfChannels; i++) {
    const destChan = dest.getChannelData(i);
    for (let s = 0; s < destChan.length; s++) {
      destChan[s] = 0;
    }
  }

  return dest;
}

export function asInterleaved(ab: XAudioBuffer): Float32Array {
  const channels = ab.numberOfChannels;

  const output = new Float32Array(channels * ab.length);

  for (let i = 0; i < ab.length; i++) {
    for (let c = 0; c < channels; c++) {
      const chan = ab.getChannelData(c);
      output[i * channels + c] = chan[i];
    }
  }

  return output;
}

export function asPlanar(
  buffer: Float32Array,
  sampleRate: number,
  channels: number = 2
): XAudioBuffer {
  // const output = new Float32Array(buffer.length);
  const channelLength = Math.floor(buffer.length / channels);
  const output = new XAudioBuffer({
    numberOfChannels: channels,
    length: channelLength,
    sampleRate: sampleRate
  });

  for (let c = 0; c < channels; c++) {
    const chan = output.getChannelData(c);
    for (let i = 0; i < channelLength; i++) {
      chan[i] = buffer[i * channels + c];
      // output[i + (c * channelLength)] = buffer[i * channels + c];
    }
  }

  return output;
}

// Straight from the pseudo-audio-param package.
function getTargetValueAtTime(
  t: number,
  v0: number,
  v1: number,
  t0: number,
  timeConstant: number
) {
  if (t <= t0) {
    return v0;
  }
  return v1 + (v0 - v1) * Math.exp((t0 - t) / timeConstant);
}

// How does targetValueAtTime timeConstant work?
// https://stackoverflow.com/a/20617245/169491

export function applyFadeIn(buffer: XAudioBuffer): XAudioBuffer {
  const t0 = 0;
  const v0 = 0;
  const v1 = 1;
  const constant = buffer.length / 10;

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    const chan = buffer.getChannelData(i);
    for (let j = 0; j < chan.length; j++) {
      const v = getTargetValueAtTime(j, v0, v1, t0, constant);
      chan[j] = chan[j] * v;
    }
  }

  return buffer;
}

export function applyFadeOut(buffer: XAudioBuffer): XAudioBuffer {
  const t0 = 0;
  const v0 = 1;
  const v1 = 0;
  const constant = buffer.length / 4;

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    const chan = buffer.getChannelData(i);
    for (let j = 0; j < chan.length; j++) {
      const v = getTargetValueAtTime(j, v0, v1, t0, constant);
      chan[j] = chan[j] * v;
    }
  }

  return buffer;
}
