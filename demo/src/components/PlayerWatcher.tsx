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
import { SmartPlayer, TimeInstant } from '../../../src/';

type Props = {
  player: SmartPlayer;
  // forceUpdate: boolean;
  children: (
    renderTime: TimeInstant,
    playing: boolean
  ) => React.ReactChildren | React.ReactChild;
};

const initialState = {
  renderTime: TimeInstant.ZERO,
  playing: false
};

type State = Readonly<typeof initialState>;

export class PlayerWatcher extends React.Component<Props, State> {
  state = initialState;

  private playheadPoll: null | number = null;

  componentDidMount() {
    window.clearInterval(this.playheadPoll || 0);
    const tickInterval = 20; //(8192 / 3 / 44100) * 1000;

    this.playheadPoll = window.setInterval(() => {
      const { player } = this.props;
      const { renderTime, playing } = player;

      this.setState(state => {
        if (state.renderTime.eq(renderTime) && state.playing === playing)
          return state;
        return { renderTime, playing };
      });

      // this.setState({
      //   renderTime,
      //   playing
      // });
    }, tickInterval);
  }

  // shouldComponentUpdate(nextProps: Props, nextState: State) {
  //   if (nextProps.forceUpdate) return true;
  //   if (this.state.playing !== nextState.playing) return true;
  //   if (this.state.renderTime.neq(nextState.renderTime)) return true;
  //   return false;
  // }

  componentWillUnmount() {
    window.clearInterval(this.playheadPoll || 0);
  }

  render() {
    return this.props.children(
      this.state.renderTime,
      this.props.player.playing
    );
  }
}
