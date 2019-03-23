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
import { NodePlaybackDescription, TimeInstant } from '../../../../src/';
import * as React from 'react';
import { CanvasPowered } from './CanvasPowered';

type LoopNodeMonitorProps = {
  node: LoopNode;
  description: NodePlaybackDescription;
};

export class LoopNodeMonitor extends React.Component<LoopNodeMonitorProps> {
  shouldComponentUpdate(nextProps: LoopNodeMonitorProps) {
    return this.props.description.time.neq(nextProps.description.time);
  }

  componentDidMount() {}

  render() {
    const { node } = this.props;
    const when = TimeInstant.fromNanos(node.when);
    const duration = TimeInstant.fromNanos(node.duration);
    const loopCount = node.loopCount;

    const { time } = this.props.description;

    const {
      loopElapsedTime,
      loopsSinceStart,
      currentLoopStartTime,
      currentLoopEndTime,
      infinite
    } = this.props.description.loop!;

    // This is the endTime for only the first loop!
    const endTime = when.add(duration);
    let loopProgress: number;

    if (loopElapsedTime.lte(TimeInstant.ZERO)) {
      // loop hasn't started yet
      loopProgress = 0;
    } else if (!infinite && loopsSinceStart >= loopCount) {
      // loop is over!
      loopProgress = 1;
    } else {
      // loop in progress
      loopProgress = loopElapsedTime.div(duration);
    }

    const leadupProgress = time.lte(when) ? when.sub(time).div(when) : 0;
    const loopBars = infinite ? 1 : loopCount;

    //  leadup (height * 0.25)                          ----------------------------
    //  the loop iteration (height * (0.75 / loopCount) ==============|=============
    //  if infinite loop, div by 1.

    const leadupColor = 'magenta';
    const playheadColor = 'magenta';
    const fileColor = 'blue';
    const playheadWidth = 2;

    const hoverDescription =
      'MAGENTA BAR: time until this node begins playing, ' +
      'according to its playback config. \n' +
      'BLUE: A single loop duration. \n' +
      "MAGENTA LINE: The loop's playhead";

    return (
      <div title={hoverDescription} style={{ cursor: 'pointer' }}>
        <CanvasPowered width={200} height={25} autofit="width">
          {(cvs, ctx) => {
            const leadupHeight = cvs.height * 0.25;
            const loopY = leadupHeight;
            const singleLoopHeight = cvs.height * (0.75 / loopBars);

            ctx.clearRect(0, 0, cvs.width, cvs.height);

            // Draw the leadup.
            ctx.fillStyle = leadupColor;
            ctx.fillRect(0, 0, cvs.width * leadupProgress, leadupHeight);

            if (!infinite) {
              const completedHeight =
                singleLoopHeight * (loopsSinceStart > 0 ? loopsSinceStart : 0);

              // Draw the completed bars
              ctx.fillStyle = fileColor;
              ctx.fillRect(0, loopY, cvs.width, completedHeight);

              // Draw the current/upcoming loop
              ctx.fillStyle = fileColor;
              ctx.fillRect(
                0,
                loopY + completedHeight,
                cvs.width,
                singleLoopHeight
              );

              // Draw the playhead
              ctx.fillStyle = playheadColor;
              ctx.fillRect(
                Math.min(cvs.width * loopProgress, cvs.width - playheadWidth),
                Math.min(
                  loopY + completedHeight,
                  cvs.height - singleLoopHeight
                ),
                playheadWidth,
                singleLoopHeight
              );
            } else {
              // Draw the current/upcoming loop
              ctx.fillStyle = fileColor;
              ctx.fillRect(0, loopY, cvs.width, singleLoopHeight);

              // Draw the playhead
              ctx.fillStyle = playheadColor;
              ctx.fillRect(
                cvs.width * loopProgress,
                loopY,
                playheadWidth,
                singleLoopHeight
              );
            }
          }}
        </CanvasPowered>
      </div>
    );
  }
}
