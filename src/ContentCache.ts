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
import { XAudioBuffer } from './XAudioBuffer';

const DBG_STR = 'nf:content-cache';
const dbg = Debug(DBG_STR);

type LoadingScore = {
  requests: Set<Promise<XAudioBuffer>>;
  graphId: string;
  loaded: Promise<void>;
  signalLoaded: () => void;
  signalFailed: (err: Error) => void;
};

export class ContentCache {
  constructor(
    // Shared cache of requests, to share resources across Scores.
    private requests = new Map<string, Promise<XAudioBuffer>>(),
    // The global cache of loaded/decoded audio.
    private audio = new Map<string, XAudioBuffer>(),
    // Per-score mapping of requests, so loading a single Score does not block
    // other scores, and we can know when a single Score is done.
    private scores = new Map<string, LoadingScore>()
  ) {}

  async get(
    uri: string,
    graphId: string,
    fetcher: () => Promise<XAudioBuffer>
  ): Promise<XAudioBuffer> {
    const existingAudio = this.audio.get(uri);
    if (existingAudio) return existingAudio;

    let lscore = this.scores.get(graphId);
    if (!lscore) {
      dbg('creating LoadingScore for graph %s', graphId);

      // This is super hacky, just to prevent typescript from complaining
      // and allow the promise controls to escape.
      let signalLoaded: () => void = () => {};
      let signalFailed: (err: Error) => void = _ => {};

      const p = new Promise<void>((resolve, reject) => {
        signalLoaded = resolve;
        signalFailed = reject;
      });

      lscore = {
        requests: new Set(),
        graphId,
        loaded: p,
        signalLoaded,
        signalFailed
      };

      this.scores.set(graphId, lscore);
    }

    let request;

    const existingRequest = this.requests.get(uri);
    if (existingRequest) {
      request = existingRequest;
    } else {
      request = fetcher();
      this.requests.set(uri, request);
    }

    lscore.requests.add(request);

    let ab;

    try {
      ab = await request;
      // Add to the globally-shared cache.
      this.audio.set(uri, ab);

      // Remove from requests pool
      this.requests.delete(uri);

      // Remove from score-specific pool
      lscore.requests.delete(request);

      // Check if this score is done. It would be nice if we could be more
      // sure than juse size 0.
      if (lscore.requests.size === 0) {
        dbg('resolving LoadingScore for graph %s', graphId);
        lscore.signalLoaded();

        // And then remove the lscore, in case the graph is loaded again.
        this.scores.delete(graphId);
      }

      return ab;
    } catch (e) {
      // A single failed request fails the graph? I guess so for now.
      lscore.signalFailed(e);
      // Delete the lscore in case another attempt is made.
      this.scores.delete(graphId);
      throw e;
    }
  }

  scoreContentLoaded(graphId: string): Promise<void> {
    const lscore = this.scores.get(graphId);
    // Can't find it? Assume all the content was already loaded...
    if (!lscore) return Promise.resolve();
    return lscore.loaded;
  }
}
