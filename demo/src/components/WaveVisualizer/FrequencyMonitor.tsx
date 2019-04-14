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
import { CanvasPowered } from '../ScoreVisualizer/CanvasPowered';

type Props = {
  frequencies: Uint8Array;
};

// Frequency values are 8-bit unsigned integers, per AnalyserNode.getByteFrequencyData();
const scalingDenominator = 1 / 255; // denominator is maximum value, 2^8 -1
const barColor = '#000000';

export class FrequencyMonitor extends React.Component<Props> {
  drawParamValues = (cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const { frequencies } = this.props;

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const canvasHeight = cvs.height;
    const canvasWidth = cvs.width;
    const binCount = frequencies.length;
    const barWidth = canvasWidth / binCount;
    ctx.fillStyle = barColor;

    for (let i = 0; i < binCount; i++) {
      const percent = frequencies[i] * scalingDenominator;
      const height = canvasHeight * percent;
      const offset = canvasHeight - height - 1;
      ctx.fillRect(i * barWidth, offset, barWidth, height);
    }
  };

  render() {
    return (
      <CanvasPowered autofit="width" width={200} height={400}>
        {this.drawParamValues}
      </CanvasPowered>
    );
  }
}
