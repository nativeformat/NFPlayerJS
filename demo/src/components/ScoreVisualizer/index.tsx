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
import {
  FileNode,
  LoopNode,
  StretchNode,
  GainNode as GGainNode,
  TypedNode
} from 'nf-grapher';
import styled from 'styled-components';
import { NodePlaybackDescription } from '../../../../src';
import { VisualGridColumn } from './VisualGridColumn';

const KIND_COLUMN_ORDER = [
  FileNode.PLUGIN_KIND,
  LoopNode.PLUGIN_KIND,
  StretchNode.PLUGIN_KIND,
  GGainNode.PLUGIN_KIND
];

const AppMainArea = styled.div`
  display: flex;
  justify-content: space-between;
`;

const AppColumn = styled.div`
  flex: 1;
  max-width: ${100 / (KIND_COLUMN_ORDER.length + 1)}vw;
`;

type Props = {
  descriptions: NodePlaybackDescription[];
  nodes: TypedNode[];
};

export class ScoreVisualizer extends React.Component<Props> {
  render() {
    const { descriptions, nodes } = this.props;
    return (
      <AppMainArea>
        {KIND_COLUMN_ORDER.map(kind => (
          <AppColumn key={kind}>
            <VisualGridColumn
              descriptions={descriptions}
              nodes={nodes}
              kind={kind}
            />
          </AppColumn>
        ))}
      </AppMainArea>
    );
  }
}
