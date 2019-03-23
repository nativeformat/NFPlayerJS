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

/**
 * Compare two XAudioBuffers, quantum by quantum.
 *
 * When I attempted to use a simple jest matcher for each channel, or even the
 * audio data, the entire node process hung and never completed. For example:
 *  expect(received.getChannelData(0)).toEqual(expected.getChannelData(0));
 * This bypasses that problem, and also adds context for which quantums
 * differed to help aid debugging the problem.
 */
export function expectQuantums(
  received: XAudioBuffer,
  expected: XAudioBuffer,
  quantumSize: number
) {
  const requiredQuantums = expected.length / quantumSize;
  for (let i = 0; i < requiredQuantums; i++) {
    for (let j = 0; j < expected.numberOfChannels; j++) {
      const msg = `channel: ${j}, sampleIndex: ${i *
        quantumSize}, quantumIndex: ${i}`;
      const start = i * quantumSize;
      const end = (i + 1) * quantumSize;
      const receivedQuantum = received.getChannelData(0).subarray(start, end);
      const expectedQuantum = expected.getChannelData(0).subarray(start, end);
      expect({ msg, data: receivedQuantum }).toEqual({
        msg,
        data: expectedQuantum
      });
    }
  }
}
