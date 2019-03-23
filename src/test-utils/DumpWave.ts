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

import * as WavDecoder from 'wav-decoder';
import * as WavEncoder from 'wav-encoder';
import { copy } from '../AudioBufferUtils';
import { XAudioBuffer } from '../XAudioBuffer';
import { writeFile } from '../pio';
import { join } from 'path';

export async function dumpWave(
  output: XAudioBuffer,
  filename: string = 'test.wav'
) {
  let channelData = [];
  for (let i = 0; i < output.numberOfChannels; i++) {
    channelData.push(output.getChannelData(i));
  }

  const encoded = await WavEncoder.encode({
    sampleRate: output.sampleRate,
    channelData
  });

  const dest = join(process.cwd(), filename);
  await writeFile(dest, new DataView(encoded));
}
