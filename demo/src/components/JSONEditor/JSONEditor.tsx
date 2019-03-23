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
import { SmartPlayer, TimeInstant } from '../../../../src';
import { examples, ExampleJSON } from '../../ExampleJSONScores';

import { MonacoEditor } from '../Monaco';
import { PlayerControlBar } from '../PlayerControlBar';
import { PlayerWatcher } from '../PlayerWatcher';
import { Score, TypedNode } from 'nf-grapher';
import { ScoreVisualizer } from '../ScoreVisualizer';
import {
  VerticalFitArea,
  VerticalFixedSection,
  VerticalExpandableSection
} from '../VerticalLayout';

// Nodes within Grapher Scores are of type Node and are a 1:1 with their JSON
// serialization. But if you call Score.from(obj) the nodes are "parsed" into
// a TypedNode. This is a gotcha.
const extractTypedNodes = (score: Score) =>
  Score.from(score).graph.nodes as TypedNode[];

type Props = {
  player: SmartPlayer;
};

const initialState = {
  example: examples[0],
  exampleTypedNodes: extractTypedNodes(examples[0].score),
  loading: false
};

type State = Readonly<{
  example: undefined | ExampleJSON;
  exampleTypedNodes: TypedNode[];
  loading: boolean;
}>;

export class JSONEditor extends React.Component<Props, State> {
  readonly state = initialState;

  private getEditorValue: () => string = () => '';

  onExampleSelect = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const example = examples.find(
      example => example.name === event.target.value
    );

    this.setState({
      example: example,
      exampleTypedNodes: example ? extractTypedNodes(example.score) : []
    });

    const { player } = this.props;

    if (player.playing) {
      player.playing = false;
    }
  };

  handlePlayPause = async () => {
    const { player } = this.props;

    if (player.playing) {
      player.playing = false;
      return;
    }

    try {
      const editorValue: Score = JSON.parse(this.getEditorValue());
      const playerValue: Score[] = JSON.parse(player.getJson());

      const editorJSON = JSON.stringify(editorValue);
      const playerJSON = JSON.stringify(playerValue[0]);
      const exampleJSON = JSON.stringify(this.state.example.score);

      // We only want to reload the graph if the Score is actually different.
      if (!playerValue.length || editorJSON !== playerJSON) {
        // The editor value is the source of true, send it into the player.
        this.setState({ loading: true });
        await player.setJson(editorJSON);

        // We need these to visualize the score.
        const exampleTypedNodes = extractTypedNodes(editorValue);

        // Only set the internal state to "user edited" if the current JSON is
        // likely user-edited.
        if (editorJSON !== exampleJSON) {
          this.setState({
            example: {
              name: 'User edited',
              score: editorValue
            }
          });
        }

        this.setState({ loading: false, exampleTypedNodes });
      }
    } catch (e) {}

    player.playing = !player.playing;
  };

  render() {
    const { player } = this.props;
    const { example, loading, exampleTypedNodes } = this.state;

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
          <PlayerWatcher player={player}>
            {(currentTime, playing) =>
              playing ? (
                <ScoreVisualizer
                  nodes={exampleTypedNodes}
                  descriptions={player.getPlaybackDescription(currentTime)}
                />
              ) : (
                <MonacoEditor
                  language={'json'}
                  value={
                    example ? JSON.stringify(example.score, null, '  ') : ''
                  }
                  valueDelegate={getValue => (this.getEditorValue = getValue)}
                />
              )
            }
          </PlayerWatcher>
        </VerticalExpandableSection>
      </VerticalFitArea>
    );
  }
}
