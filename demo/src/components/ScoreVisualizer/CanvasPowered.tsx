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

type CanvasProps = {
  width: number;
  height: number;
  autofit: 'none' | 'width';
  children: (cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void;
};

const initialCanvasState = {
  width: 0
};

export class CanvasPowered extends React.Component<
  CanvasProps,
  typeof initialCanvasState
> {
  private cvsRef = React.createRef<HTMLCanvasElement>();
  private ctx: CanvasRenderingContext2D | null = null;

  state = initialCanvasState;

  componentDidMount() {
    if (!this.cvsRef.current) return;
    this.ctx = this.cvsRef.current.getContext('2d');

    if (this.props.autofit === 'none') return;

    const parent = this.cvsRef.current.parentNode;
    if (!parent) return;

    const computed = window.getComputedStyle(parent as Element);
    const rect = (parent as Element).getBoundingClientRect();
    const maxWidth =
      rect.width -
      parseFloat(computed.paddingLeft || '0') -
      parseFloat(computed.paddingRight || '0');

    this.setState({ width: maxWidth }, () => {
      // Wait until after the state change has been propagated, because setting
      // width/height on a canvas clears the contents.
      // Without this, the canvas will be blank until we start playing.
      this.redraw();
    });
  }

  redraw() {
    if (this.cvsRef.current && this.ctx) {
      this.props.children(this.cvsRef.current, this.ctx);
    }
  }

  render() {
    this.redraw();

    const width =
      this.state.width !== initialCanvasState.width
        ? this.state.width
        : this.props.width;

    return (
      <canvas ref={this.cvsRef} height={this.props.height} width={width} />
    );
  }
}
