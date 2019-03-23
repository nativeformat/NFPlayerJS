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

declare module 'web-audio-test-api';

declare module 'wav-decoder' {
  type WavDecoderOptions = {
    symmetric?: boolean;
  };

  type AudioData = {
    sampleRate: number;
    channelData: Float32Array[];
  };

  export function decode(
    src: ArrayBuffer | Buffer,
    opts?: object
  ): Promise<AudioData>;

  // Note: this is missing the decode.sync function because
  // it involves a much more complicated declaration.
}

declare module 'wav-encoder' {
  type WavEncoderOptions = {
    bitDepth?: number; // Default: 16
    float?: boolean; // Default: false
    symmetric?: boolean;
  };

  type AudioData = {
    sampleRate: number;
    channelData: Float32Array[];
  };

  export function encode(
    audioData: AudioData,
    opts?: object
  ): Promise<ArrayBuffer>;

  // Note: this is missing the encode.sync function because
  // it involves a much more complicated declaration.
}
