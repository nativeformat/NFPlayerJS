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

import { XAudioBuffer } from '../XAudioBuffer';

export type RendererInfo = {
  // hz
  sampleRate: number;
  // how large the render window/frame/sample count is
  quantumSize: number;
  // How many channels our output "device" has.
  channelCount: number;
  // Really just a shim around decodeAudioData for now. Mostly just to
  // divorce the abilities of the AudioContext from the AudioContext itself.
  decode: (uri: string, data: ArrayBuffer) => Promise<XAudioBuffer>;
};

export function XAudioBufferFromInfo(info: RendererInfo, length: number) {
  return new XAudioBuffer({
    numberOfChannels: info.channelCount,
    sampleRate: info.sampleRate,
    length
  });
}
