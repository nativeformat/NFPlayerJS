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
import { TypedNode } from 'nf-grapher';
import styled from 'styled-components';
import { SourceMonitor } from './SourceMonitor';
import { NodePlaybackDescription } from '../../../../src/';
import { DemoTheme } from '../Theme';
import { ParamMonitor } from './ParamMonitor';

const niceNodeName = (name: string) => {
  const last = name.split('.').pop();
  return last;
};

const shortGID = (id: string) => id.substr(0, 8);

const StyledNodePanel = styled.div`
  position: relative;
  background-color: #ccc;
  font-size: 12px;
  padding: ${DemoTheme.unitPx};
  margin: ${DemoTheme.unitPx};

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    border-width: ${DemoTheme.unitPx} ${DemoTheme.unitPx} 0px 0px;
    border-style: solid;
    border-color: #fff transparent transparent #fff;
  }
`;

const PanelTitleBar = styled.header`
  text-transform: uppercase;
  display: flex;
`;

const PanelTitle = styled.span`
  flex: 1;
`;

// TODO: get some flexbox in here?
const PanelNumericTimeDisplay = styled.span`
  text-align: right;
  flex: 1;
`;

const StyledConfigTable = styled.table`
  margin: ${DemoTheme.unitPx} 0 ${DemoTheme.unitPx} 0;
  width: 100%;
  table-layout: fixed;
`;

const StyledTruncatedText = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

// TODO: don't use a table?
const configTableForNode = (node: TypedNode) => {
  const config = node.toNode().config;
  if (!config) return null;
  return (
    <StyledConfigTable>
      <tbody>
        {Object.keys(config).map(key => (
          <tr key={key}>
            <td>{key}</td>
            <td>
              <StyledTruncatedText title={config[key]}>
                {config[key]}
              </StyledTruncatedText>
            </td>
          </tr>
        ))}
      </tbody>
    </StyledConfigTable>
  );
};

export const NodePanel: React.SFC<{
  node: TypedNode;
  description: NodePlaybackDescription;
}> = ({ node, description }) => {
  const { time } = description;
  const timeNotion =
    "This node's notion of current time, which can be " +
    'dilated by downstream stretch/loop nodes';

  return (
    <StyledNodePanel>
      <PanelTitleBar>
        <PanelTitle>
          {niceNodeName(node.kind)} {shortGID(node.id)}
        </PanelTitle>
        <PanelNumericTimeDisplay
          title={timeNotion}
          style={{ cursor: 'pointer' }}
        >
          {time.asSeconds().toFixed(3)}
        </PanelNumericTimeDisplay>
      </PanelTitleBar>
      {configTableForNode(node)}
      {SourceMonitor.fromNode(node, description)}
      {ParamMonitor.fromNode(node, time)}
    </StyledNodePanel>
  );
};
