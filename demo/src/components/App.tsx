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

import { Score } from 'nf-grapher';
import { ScriptProcessorRenderer, SmartPlayer, TimeInstant } from 'nf-player';
import { XAudioContext } from 'nf-player';
import * as React from 'react';
import styled from 'styled-components';

import { type PanelSlug, parseHash, setRoute, subscribeRoute } from '../router';
import { CODEEditor } from './CODEEditor/CODEEditor';
import { JSONEditor } from './JSONEditor/JSONEditor';
import { DemoTheme } from './Theme';
import {
  VerticalExpandableSection,
  VerticalFitArea,
  VerticalFixedSection,
} from './VerticalLayout';
import { WaveVisualizer } from './WaveVisualizer/WaveVisualizer';

const StyledApplication = styled.div`
  font-family: ${DemoTheme.fontFamily};
  color: #000;
  font-size: ${DemoTheme.bodyFontSize};
  height: 100%;
`;

const DEFAULT_PANEL: PanelSlug = 'code';

// https://webaudio.github.io/web-audio-api/#AnalyserNode-attributes
const defaultAnalyserOptions = {
  smoothingTimeConstant: 0.8,
  fftSize: 2048,
  minDecibels: -100,
  maxDecibels: -30,
};

const initialRoute = parseHash();

const initialAppState = {
  panel: initialRoute.panel ?? DEFAULT_PANEL,
  exampleSlug: initialRoute.exampleSlug,
  player: new SmartPlayer(),
  analyser: XAudioContext().createAnalyser(),
};

type AppState = Readonly<typeof initialAppState>;
type AppProps = unknown;

export class App extends React.Component<AppProps, AppState> {
  readonly state: AppState = initialAppState;

  private unsubscribeRoute: (() => void) | undefined;

  componentDidMount() {
    // The mounted panel's editor will write its resolved slug back via
    // onExampleChange, which populates the URL on first load.
    this.unsubscribeRoute = subscribeRoute((route) => {
      const nextPanel = route.panel ?? DEFAULT_PANEL;
      if (nextPanel !== this.state.panel) {
        this.switchPanel(nextPanel, route.exampleSlug);
      } else if (route.exampleSlug !== this.state.exampleSlug) {
        this.setState({ exampleSlug: route.exampleSlug });
      }
    });
  }

  componentWillUnmount() {
    this.unsubscribeRoute?.();
  }

  switchPanel(to: PanelSlug, exampleSlug?: string) {
    if (this.state.player.playing) {
      this.state.player.playing = false;
    }

    this.state.player.renderTime = TimeInstant.ZERO;
    this.state.player.setJson(JSON.stringify(new Score()));

    let nextRenderer;
    let analyser;
    if (to === 'visualizer') {
      const context = XAudioContext();
      analyser = new AnalyserNode(context, defaultAnalyserOptions);
      analyser.connect(context.destination);
      nextRenderer = new ScriptProcessorRenderer(context, undefined);

      // FFT analyzer - note that processor is a private property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (nextRenderer as any).processor.connect(analyser);
    } else {
      // SmashEditor needs a much smaller quantum in order to
      // feel responsive when triggering one-shots!
      nextRenderer = new ScriptProcessorRenderer(undefined, undefined);
    }

    const nextPlayer = new SmartPlayer(nextRenderer);
    const nextState = {
      panel: to,
      exampleSlug,
      player: nextPlayer,
    };

    setRoute({ panel: to, exampleSlug });

    // typescript type guard
    if (analyser !== undefined) {
      this.setState({
        ...nextState,
        analyser,
      });
    } else {
      this.setState(nextState);
    }
  }

  handlePanelButton = (to: PanelSlug) => {
    this.switchPanel(to, undefined);
  };

  handleExampleChange = (slug: string | undefined) => {
    this.setState({ exampleSlug: slug });
    setRoute({ panel: this.state.panel, exampleSlug: slug });
  };

  componentDidUpdate() {
    // Exposed on `window` so the playground scripts can drive the player.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).p = this.state.player;
  }

  render() {
    const { panel, player, analyser, exampleSlug } = this.state;

    return (
      <StyledApplication>
        <VerticalFitArea>
          <VerticalFixedSection>
            <button onClick={() => this.handlePanelButton('code')}>
              {panel === 'code' && '>'} CODE EDITOR
            </button>
            <button onClick={() => this.handlePanelButton('json')}>
              {panel === 'json' && '>'} JSON
            </button>
            <button onClick={() => this.handlePanelButton('visualizer')}>
              {panel === 'visualizer' && '>'} VISUALIZER
            </button>
          </VerticalFixedSection>
          <VerticalExpandableSection>
            {panel === 'json' && (
              <JSONEditor
                player={player}
                exampleSlug={exampleSlug}
                onExampleChange={this.handleExampleChange}
              />
            )}
            {panel === 'code' && (
              <CODEEditor
                player={player}
                exampleSlug={exampleSlug}
                onExampleChange={this.handleExampleChange}
              />
            )}
            {panel === 'visualizer' && (
              <WaveVisualizer
                player={player}
                analyser={analyser}
                exampleSlug={exampleSlug}
                onExampleChange={this.handleExampleChange}
              />
            )}
          </VerticalExpandableSection>
        </VerticalFitArea>
      </StyledApplication>
    );
  }
}
