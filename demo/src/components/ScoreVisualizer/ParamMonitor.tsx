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

import * as React from 'react';
import { TimeInstant, ScoreAudioParam } from '../../../../src/';
import styled from 'styled-components';
import { TypedNode, Command } from 'nf-grapher';
import { CanvasPowered } from './CanvasPowered';
import { DemoTheme } from '../Theme';

const StyledParamMonitor = styled.div``;

const StyledParamName = styled.div`
  padding-bottom: ${DemoTheme.unitPx};
`;

type ParamDescription = {
  first: TimeInstant;
  last: TimeInstant;
  firstDefined: TimeInstant;
  values: number[];
};

type Props = {
  name: string;
  desc: ParamDescription;
  currentTime: TimeInstant;
};

export class ParamMonitor extends React.Component<Props> {
  static fromNode(node: TypedNode, currentTime: TimeInstant) {
    let meters: JSX.Element[] = [];

    const n = node.toNode();
    const params = n.params!;
    Object.keys(params).forEach(name => {
      const commands = params[name];

      meters.push(
        <ParamMonitor
          key={name}
          name={name}
          desc={ParamMonitor.ExtractDescription(commands)}
          currentTime={currentTime}
        />
      );
    });

    return meters;
  }

  static ExtractDescription(
    paramCommands: Command[],
    timeStep = TimeInstant.fromSeconds(8192 / 44100)
  ): ParamDescription {
    const p1 = new ScoreAudioParam(1);
    for (let i = 0; i < paramCommands.length; i++) {
      p1.applyScoreCommand(paramCommands[i]);
    }

    if (!p1.events.length) {
      return {
        first: TimeInstant.ZERO,
        last: TimeInstant.ZERO,
        firstDefined: TimeInstant.ZERO,
        // TODO: put actual default value here?
        values: []
      };
    }

    const firstDefined = TimeInstant.fromSeconds(p1.events[0].time);
    const first = TimeInstant.ZERO;
    const last = TimeInstant.fromSeconds(p1.events[p1.events.length - 1].time);
    const duration = last.sub(first);
    const ts = timeStep.asSeconds();

    if (ts === 0) {
      throw new Error('Invalid time step requested for AudioParam extraction');
    }

    const valuesRequired = duration.eq(TimeInstant.ZERO)
      ? 1
      : Math.floor(duration.div(timeStep));
    const values = [];
    let time = 0;

    while (values.length < valuesRequired) {
      values.push(p1.getValueAtTime(time));
      time += ts;
    }

    return {
      first,
      last,
      firstDefined,
      values
    };
  }

  drawParamValues = (cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const { first, last, values } = this.props.desc;
    const { currentTime } = this.props;

    const height2 = cvs.height / 2;
    const min = Math.min(...values); // might have a problem with arg length
    const max = Math.max(...values);
    let spread = max - min;
    if (spread === 0) {
      spread = 1; // maybe???
    }

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.strokeStyle = 'yellow';
    ctx.beginPath();
    ctx.moveTo(0, height2);

    let lastY = height2;

    if (!values.length) {
      ctx.lineTo(cvs.width - 1, height2);
    } else {
      const valueHorizontalInterval = cvs.width / values.length;

      // Draw the values
      for (let i = 0; i < values.length; i++) {
        // figure out horizontal
        const x = valueHorizontalInterval * i;
        const y = height2 - ((values[i] - min) / spread) * height2;
        lastY = y;

        if (i === 0) {
          // Avoid drawing a line from the start point.
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Always finish the line.
      ctx.lineTo(cvs.width, lastY);
    }

    ctx.stroke();

    ctx.fillStyle = 'magenta';
    const playheadWidth = 2;

    if (currentTime.gte(last)) {
      // draw progress at the end
      ctx.fillRect(cvs.width - playheadWidth, 0, playheadWidth, cvs.height);
    } else if (currentTime.lte(first)) {
      // draw progress at the beginning
      ctx.fillRect(0, 0, playheadWidth, cvs.height);
    } else {
      // draw in the middle...
      const duration = last.sub(first);
      const progress = currentTime.sub(first).div(duration);
      ctx.fillRect(
        progress * (cvs.width - playheadWidth),
        0,
        playheadWidth,
        cvs.height
      );
    }
  };

  render() {
    const { first, last, values } = this.props.desc;
    const { currentTime } = this.props;
    const duration = last.sub(first);

    // Really this is just the time until the last defined event.
    const progress =
      duration.asNanos() !== 0
        ? Math.min(currentTime.sub(first).div(duration), 1)
        : 0;

    // TODO: really need a default value...
    // Find the nearest computed value to the current time.
    const index = Math.floor(
      Math.min(Math.max(progress, 0), 1) * (values.length - 1)
    );
    const value = values.length ? values[index] : 1;

    const hover =
      'YELLOW: The value of the Param over time, normalized to ' +
      "the maximum and minimum values found in the Param's command list. \n" +
      'MAGENTA: Current time (playhead) for this Param. When the playhead ' +
      'reaches the end, that is only the last specified value for the Param: ' +
      'that value is still applied to any audio passing through.';

    return (
      <StyledParamMonitor title={hover} style={{ cursor: 'pointer' }}>
        <StyledParamName>
          {this.props.name} {value.toFixed(3)}
        </StyledParamName>
        <CanvasPowered autofit="width" width={200} height={50}>
          {this.drawParamValues}
        </CanvasPowered>
      </StyledParamMonitor>
    );
  }
}
