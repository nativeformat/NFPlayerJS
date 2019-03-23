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
import { SmartPlayer, TimeInstant } from '../../../../src/';
import {
  VerticalFitArea,
  VerticalFixedSection,
  VerticalExpandableSection
} from '../VerticalLayout';
import {
  examples,
  ExampleScript,
  CompiledPlaygroundScript
} from '../../ExampleScripts';
import { PlayerControlBar } from '../PlayerControlBar';
import { PlayerWatcher } from '../PlayerWatcher';
import { MonacoEditor } from '../Monaco';

import * as NFGrapher from 'nf-grapher';
import * as NFPlayer from '../../../../src/';

import * as ts from 'typescript';

type Props = {
  player: SmartPlayer;
};

type State = {
  example: undefined | ExampleScript;
  loading: boolean;
};

const initialState: State = {
  example: examples[0],
  loading: false
};

// This is super esoteric. The TS compiler will transpile `async`, so to get
// an _actual_ async function, we need to eval it...
const GetAsyncFunctionCtor = new Function(
  'return Object.getPrototypeOf(async function(){}).constructor'
);
const AsyncFunction = GetAsyncFunctionCtor();

export class CODEEditor extends React.Component<Props, State> {
  readonly state = initialState;

  private getEditorValue: () => string = () => '';

  componentDidMount() {
    this.setState({
      example: {
        name: examples[0].name,
        script: this.processExample(examples[0])
      }
    });
  }

  processExample(example: ExampleScript) {
    // const firstIdx = example.script.indexOf('{');
    // const lastIdx = example.script.lastIndexOf('}');
    // const stripped = example.script.substring(firstIdx + 1, lastIdx);
    // return stripped;

    // Strip the leading whitespace.

    let lines = example.script.split('\n');
    if (lines[0].length === 0) lines.shift();

    const nonWhitespaceMatch = lines[0].match(/\S/);

    if (nonWhitespaceMatch !== null) {
      lines = lines.map(line => line.substring(nonWhitespaceMatch.index!));
    }

    // This is to allow monaco to not red squiggle top-level await.
    lines.unshift('async function main () {');
    lines.push('}');

    return lines.join('\n');
  }

  onExampleSelect = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const example = examples.find(
      example => example.name === event.target.value
    );

    if (example) {
      this.setState({
        example: {
          name: example.name,
          script: this.processExample(example)
        }
      });
    } else {
      this.setState({
        example
      });
    }

    const { player } = this.props;

    if (player.playing) {
      player.playing = false;
    }

    player.renderTime = TimeInstant.ZERO;
  };

  handlePlayPause = () => {
    const { player } = this.props;
    player.playing = !player.playing;
  };

  onEvalCode = async () => {
    const code = this.getEditorValue();
    const { player } = this.props;

    // TODO: expose a document or iframe env to the code so it can
    // attach arbitrary DOM stuff too, like user-clicks or buttons.
    // Probably have to re-evaluate how the player is passed around,
    // since it will be difficult to expose it to an iframe.

    const transpiled = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.ES2015 }
    });

    const fn = new AsyncFunction(
      'p',
      'NFGrapher',
      'NFPlayer',
      transpiled.outputText + ';return main();'
    ) as CompiledPlaygroundScript;

    try {
      this.setState({ loading: true });
      // blank out the current scores
      await player.dequeueScores();
      await fn(player, NFGrapher, NFPlayer);
    } catch (e) {
      // temp for now
      console.error(e);
    }

    this.setState({ loading: false });
  };

  render() {
    const { player } = this.props;
    const { example, loading } = this.state;

    return (
      <VerticalFitArea>
        <VerticalFixedSection>
          <label>
            Examples:
            <select
              onChange={this.onExampleSelect}
              value={example ? example.name : undefined}
            >
              {examples.map(example => (
                <option key={example.name} value={example.name}>
                  {example.name}
                </option>
              ))}
            </select>
          </label>
          <PlayerWatcher player={player}>
            {(currentTime, playing) => (
              <PlayerControlBar
                onEval={this.onEvalCode}
                currentTime={currentTime}
                isPlaying={playing}
                isLoading={loading}
                onPlayPause={this.handlePlayPause}
                onSeek={amount => {
                  const total = player.renderTime.add(amount);
                  player.renderTime = total.lt(TimeInstant.ZERO)
                    ? TimeInstant.ZERO
                    : total;
                }}
              />
            )}
          </PlayerWatcher>
        </VerticalFixedSection>

        <VerticalExpandableSection>
          <MonacoEditor
            language={'typescript'}
            value={example ? example.script.toString() : ''}
            valueDelegate={getValue => (this.getEditorValue = getValue)}
          />
        </VerticalExpandableSection>
      </VerticalFitArea>
    );
  }
}
