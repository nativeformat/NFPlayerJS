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

import styled from 'styled-components';
import * as React from 'react';
import { TimeInstant } from '../../../src/';
import { DemoTheme } from './Theme';

const StyledControlBar = styled.div`
  display: flex;
  justify-content: space-between;
`;

const StyledControlBarChild = styled.div`
  flex: 1;
  text-align: center;

  &:first-child {
    text-align: left;
  }

  &:last-child {
    text-align: right;
  }
`;

const StyledButton = styled.button`
  font-size: ${DemoTheme.bodyFontSize};
`;

type Props = {
  currentTime: TimeInstant;
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onSeek: (amount: TimeInstant) => void;
  onEval?: () => void;
};

type State = {
  changing: boolean;
};

const initialState: State = {
  changing: false
};

export class PlayerControlBar extends React.PureComponent<Props, State> {
  private state = initialState;

  onSeekBack = (seconds?: number) => {
    this.props.onSeek(TimeInstant.fromSeconds(seconds || -30));
  };

  onSeekForward = (seconds?: number) => {
    this.props.onSeek(TimeInstant.fromSeconds(seconds || 30));
  };

  onChange = (changing: boolean) => {
    this.setState({ changing });
  };

  render() {
    const icon = this.props.isPlaying ? '❙❙' : '►';
    const { isLoading } = this.props;
    return (
      <StyledControlBar data-info="styled-control-bar">
        <StyledControlBarChild>
          {this.props.currentTime.asSeconds().toFixed(3)}
        </StyledControlBarChild>

        {this.props.onEval && (
          <StyledControlBarChild>
            <StyledButton
              disabled={isLoading}
              onClick={() => {
                this.onChange(false);
                this.props.onEval && this.props.onEval();
              }}
            >
              Eval/Load Code from Editor
            </StyledButton>
          </StyledControlBarChild>
        )}

        <StyledControlBarChild style={{ flexGrow: 2 }}>
          <StyledButton
            disabled={isLoading || this.state.changing}
            onClick={() => this.onSeekBack(-30)}
          >
            &lt;&lt; 30s
          </StyledButton>
          <StyledButton
            disabled={isLoading || this.state.changing}
            onClick={() => this.onSeekBack(-5)}
          >
            &lt;&lt; 5s
          </StyledButton>
          <StyledButton
            disabled={isLoading || this.state.changing}
            onClick={this.props.onPlayPause}
          >
            {icon}
          </StyledButton>
          <StyledButton
            disabled={isLoading || this.state.changing}
            onClick={() => this.onSeekBack(5)}
          >
            5s &gt;&gt;
          </StyledButton>
          <StyledButton
            disabled={isLoading || this.state.changing}
            onClick={() => this.onSeekForward(30)}
          >
            30s &gt;&gt;
          </StyledButton>
        </StyledControlBarChild>

        <StyledControlBarChild>
          {isLoading && 'Loading...'}
        </StyledControlBarChild>
      </StyledControlBar>
    );
  }
}
