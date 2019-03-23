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

import { ContentCache } from '../ContentCache';
import { TimeInstant } from '../time';
import { FileNode } from 'nf-grapher';
import { SPNode, NodePlaybackDescription } from './SPNode';

import { debug as Debug } from 'debug';
import { XAudioBuffer } from '../XAudioBuffer';

const DBG_STR = 'nf:filenode';
const dbg = Debug(DBG_STR);

export class SPFileNode extends SPNode {
  protected ab: XAudioBuffer = new XAudioBuffer({
    numberOfChannels: this.info.channelCount,
    length: 1,
    sampleRate: this.info.sampleRate
  });

  getPlaybackDescription(
    renderTime: TimeInstant,
    descriptions: NodePlaybackDescription[]
  ) {
    const { id, kind } = this.node;

    descriptions.push({
      id,
      kind,
      time: renderTime,
      file: { maxDuration: TimeInstant.fromSeconds(this.ab.duration) }
    });
  }

  feed(renderTime: TimeInstant, buffers: XAudioBuffer[], sampleCount: number) {
    const ab = this.ab;

    // TODO: make this possible more easily: This is useful debug code to verify that values are transformed as expected!
    // const buf = this.ctx.createBuffer(2, sampleCount, this.ctx.sampleRate);
    // for (let i = 0; i < buf.numberOfChannels; i++) {
    //   const chan = buf.getChannelData(i);
    //   chan.forEach((_, i) => chan[i] = 1);
    // }
    // buffers.push(buf);
    // return;

    if (ab.length === 1) {
      // File has not loaded yet.
      // TODO: this is a bug! feed() should not be able to be called
      // unless timeChange has completed!
      // But SmartPlayer, when told to start playing, will call feed()
      // on the destination node with no regard for when timeChange()
      // has finished.
      return;
    }

    const node = FileNode.from(this.node);
    const when = TimeInstant.fromNanos(node.when);
    const offset = TimeInstant.fromNanos(node.offset);
    const duration = TimeInstant.fromNanos(node.duration);

    const hz = this.info.sampleRate;
    const nowSamples = renderTime.asSamples(hz);
    const whenSamples = when.asSamples(hz);
    const offsetSamples = offset.asSamples(hz);
    const durationSamples = duration.asSamples(hz);

    if (whenSamples >= nowSamples + sampleCount) {
      // start time is beyond this frame
      return;
    }

    if (whenSamples + durationSamples < nowSamples) {
      // end time is before this frame
      return;
    }

    let contentBufferStartIndex = 0;
    let outputBufferStartIndex = 0;

    if (whenSamples > nowSamples) {
      // Starting in the future, but within this frame
      outputBufferStartIndex = Math.floor(0 + (whenSamples - nowSamples));
    } else {
      // Started in the past or now
      contentBufferStartIndex = Math.floor(
        nowSamples - whenSamples + (0 + offsetSamples)
      );
    }

    if (contentBufferStartIndex > ab.length) {
      // We're done, nothing to write.
      return;
    }

    // TODO: need a case for if the file begins and ends this frame.
    // TODO: there has to be a less error-prone way to do this, right?
    // Maybe something involving ranges/frames/quantums?

    // We always want to start at beginning of the output buffer.
    const output = new XAudioBuffer({
      numberOfChannels: ab.numberOfChannels,
      length: sampleCount,
      sampleRate: hz
    });
    for (let i = 0; i < output.numberOfChannels; i++) {
      // Subarray is used below because these APIs are nuts. They don't allow
      // any specific _end_ index for when to start copying. Firefox will throw
      // if the content is too large or too small, whereas Chrome just skips
      // or fills with zeros (but doesn't throw).

      if (outputBufferStartIndex > 0) {
        // The content buffer begins playing during this frame.
        const offsetted = ab
          .getChannelData(i)
          .subarray(
            offsetSamples,
            offsetSamples + (sampleCount - outputBufferStartIndex)
          );
        output.copyToChannel(offsetted, i, outputBufferStartIndex);
      } else if (contentBufferStartIndex + sampleCount > ab.length) {
        // The content buffer ends this frame
        ab.copyFromChannel(
          output
            .getChannelData(i)
            .subarray(0, ab.length - contentBufferStartIndex),
          i,
          contentBufferStartIndex
        );
      } else {
        // The frame is contained within the content buffer
        ab.copyFromChannel(
          output.getChannelData(i),
          i,
          contentBufferStartIndex
        );
      }
    }

    buffers.push(output);
  }

  async timeChange(
    renderTime: TimeInstant,
    cache: ContentCache,
    quantumSize: number
  ) {
    await Promise.all([
      super.timeChange(renderTime, cache, quantumSize),
      this.load(cache)
    ]);
  }

  // Eventually this could probably be abstracted to include renderTime + sampleCount,
  // which allows streaming only portions, and being able to "cache" the creation of
  // the individual window buffers.
  private async load(cache: ContentCache): Promise<XAudioBuffer> {
    const node = FileNode.from(this.node);
    const uri = node.file;

    if (uri.match(/spotify:/)) {
      throw new Error('Spotify file URIs are not supported');
    }

    const content = await cache.get(uri, this.dscore.graphId(), () => {
      dbg('loading file %s', uri);
      return fetch(uri)
        .then(res => {
          if (!res.ok)
            throw new Error(
              `Failed to load ${uri}. Status: ${res.status} ${res.statusText}`
            );
          return res.arrayBuffer();
        })
        .then(ab => {
          dbg('loaded file %s', uri);
          return this.info.decode(uri, ab);
        })
        .then(ab => XAudioBuffer.fromAudioBuffer(ab));
    });

    this.ab = content;

    return content;
  }
}
