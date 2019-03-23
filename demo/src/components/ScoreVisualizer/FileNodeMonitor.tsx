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

import { FileNode } from 'nf-grapher';
import { NodePlaybackDescription, TimeInstant } from '../../../../src/';
import * as React from 'react';
import { CanvasPowered } from './CanvasPowered';

type FileNodeMonitorProps = {
  node: FileNode;
  description: NodePlaybackDescription;
};

export class FileNodeMonitor extends React.Component<FileNodeMonitorProps> {
  shouldComponentUpdate(nextProps: FileNodeMonitorProps) {
    return this.props.description.time.neq(nextProps.description.time);
  }

  componentDidMount() {}

  render() {
    const { node } = this.props;
    const when = TimeInstant.fromNanos(node.when);
    const duration = TimeInstant.fromNanos(node.duration);
    const offset = TimeInstant.fromNanos(node.offset);

    const { time } = this.props.description;
    const { maxDuration } = this.props.description.file!;

    const endTime = when.add(duration);
    const rangeProgress = time.gte(endTime)
      ? 1
      : time.lte(when)
      ? 0
      : time.sub(when).div(duration);
    const leadupProgress = time.lte(when) ? when.sub(time).div(when) : 0;

    //  leadup (height * 0.25)   ----------------------------
    //  the file (height * 0.75) =====[========|====]========
    //

    const leadupColor = 'magenta';
    const playheadColor = 'magenta';
    const rangeColor = 'rgba(0, 0, 0, 0.5)';
    const fileColor = 'blue';
    const playheadWidth = 2;

    const hoverDescription =
      'MAGENTA BAR: time until this node begins playing, ' +
      'according to its playback config. \n' +
      'BLUE: The entire file. \n' +
      'DARKER BLUE: The range of the file that will actually play. \n' +
      "MAGENTA LINE: The file's playhead";

    return (
      <div title={hoverDescription} style={{ cursor: 'pointer' }}>
        <CanvasPowered width={200} height={25} autofit="width">
          {(cvs, ctx) => {
            const leadupHeight = cvs.height * 0.25;
            const fileY = leadupHeight;
            const fileHeight = cvs.height * 0.75;

            const rangeStartX = offset.div(maxDuration) * cvs.width;
            const rangeEndX =
              maxDuration.sub(duration).div(maxDuration) * cvs.width;
            const rangeWidth = rangeEndX - rangeStartX;

            ctx.clearRect(0, 0, cvs.width, cvs.height);

            // Draw the leadup.
            ctx.fillStyle = leadupColor;
            ctx.fillRect(0, 0, cvs.width * leadupProgress, leadupHeight);

            // Draw the "file"
            ctx.fillStyle = fileColor;
            ctx.fillRect(0, fileY, cvs.width, fileHeight);

            // Draw the range
            ctx.fillStyle = rangeColor;
            ctx.fillRect(rangeStartX, fileY, rangeWidth, fileHeight);

            // Draw the playhead
            ctx.fillStyle = playheadColor;
            ctx.fillRect(
              Math.min(
                rangeStartX + rangeWidth * rangeProgress,
                cvs.width - playheadWidth
              ),
              fileY,
              playheadWidth,
              fileHeight
            );
          }}
        </CanvasPowered>
      </div>
    );
  }
}
