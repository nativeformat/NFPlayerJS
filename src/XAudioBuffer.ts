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

type XAudioBufferOptions = {
  numberOfChannels?: number;
  length: number;
  sampleRate: number;
};

// Originally from https://github.com/audiojs/audio-buffer/, MIT Licensed. Converted to TS.
// https://github.com/audiojs/audio-buffer/blob/master/LICENSE

export class XAudioBuffer {
  sampleRate: number; // float
  length: number; // unsigned long
  duration: number; // double
  numberOfChannels: number; //unsigned long

  protected _data: Float32Array; // planar
  protected _channelData: Float32Array[]; // "cached" channels as subarrays

  constructor(options: XAudioBufferOptions) {
    this.sampleRate = options.sampleRate;
    // The original impl Math.ceil(options.length)...
    // Flooring here because that's what the Float32Array Ctor will do anyway.
    this.length = Math.floor(options.length);
    this.numberOfChannels = options.numberOfChannels
      ? options.numberOfChannels
      : 1;
    this.duration = this.length / this.sampleRate;

    //data is stored as a planar sequence
    this._data = new Float32Array(this.length * this.numberOfChannels);

    //channels data is cached as subarrays
    this._channelData = [];
    for (let c = 0; c < this.numberOfChannels; c++) {
      this._channelData.push(
        this._data.subarray(c * this.length, (c + 1) * this.length)
      );
    }
  }

  /**
   * Create a new XAudioBuffer by copying data from an existing AudioBuffer.
   */
  static fromAudioBuffer(ab: AudioBuffer) {
    const x = new XAudioBuffer({
      numberOfChannels: ab.numberOfChannels,
      sampleRate: ab.sampleRate,
      length: ab.length
    });
    for (let i = 0; i < ab.numberOfChannels; i++) {
      x.copyToChannel(ab.getChannelData(i), i, 0);
    }
    return x;
  }

  /**
   * Return data associated with the channel.
   */
  getChannelData(channel: number): Float32Array {
    if (channel >= this.numberOfChannels || channel < 0 || channel == null) {
      throw Error(
        'Cannot getChannelData: channel number (' +
          channel +
          ') exceeds number of channels (' +
          this.numberOfChannels +
          ')'
      );
    }

    return this._channelData[channel];
  }

  /**
   * Place data to the destination buffer, starting from the position
   */
  copyFromChannel(
    destination: Float32Array,
    channelNumber: number,
    startInChannel = 0
  ) {
    const data = this._channelData[channelNumber];
    for (
      let i = startInChannel, j = 0;
      i < this.length && j < destination.length;
      i++, j++
    ) {
      destination[j] = data[i];
    }
  }

  /**
   * Place data from the source to the channel, starting (in self) from the position
   */
  copyToChannel(
    source: Float32Array,
    channelNumber: number,
    startInChannel = 0
  ) {
    const data = this._channelData[channelNumber];
    for (
      let i = startInChannel, j = 0;
      i < this.length && j < source.length;
      i++, j++
    ) {
      data[i] = source[j];
    }
  }
}
