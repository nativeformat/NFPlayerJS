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

import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as React from 'react';

import nfGrapherDts from '../../monaco-declarations/nf-grapher.d.ts?raw';
import nfPlayerDts from '../../monaco-declarations/nf-player.d.ts?raw';

(
  self as Window & { MonacoEnvironment?: monaco.Environment }
).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new JsonWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};

let extraLibsRegistered = false;
function registerExtraLibs() {
  if (extraLibsRegistered) return;
  extraLibsRegistered = true;
  monaco.typescript.typescriptDefaults.addExtraLib(
    [
      `declare module 'nf-grapher' {\n${nfGrapherDts}\n}`,
      `declare module 'nf-player' {\n${nfPlayerDts}\n}`,
      `declare const NFPlayer: typeof import('nf-player');`,
      `declare const NFGrapher: typeof import('nf-grapher');`,
      `declare const p: import('nf-player').SmartPlayer;`,
    ].join('\n'),
    'file:///nf-globals.d.ts',
  );
}

type Props = {
  value: string;
  language: 'typescript' | 'json';
  valueDelegate: (getValue: () => string) => void;
  onChange: (changing: boolean) => void;
};

export class MonacoEditor extends React.Component<Props> {
  private divRef = React.createRef<HTMLDivElement>();
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;

  constructor(props: Props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  onChange() {
    this.props.onChange(true);
  }

  componentDidMount() {
    if (!this.divRef.current) return;
    if (this.editor) return;

    registerExtraLibs();

    this.editor = monaco.editor.create(this.divRef.current, {
      value: this.props.value,
      language: this.props.language,
    });

    this.editor.onDidChangeModelContent(this.onChange);
    this.props.valueDelegate(() => (this.editor ? this.editor.getValue() : ''));
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.value !== prevProps.value && this.editor) {
      this.editor.setValue(this.props.value);
    }
  }

  componentWillUnmount() {
    if (!this.editor) return;
    this.editor.dispose();
  }

  render() {
    return <div style={{ height: '100%', width: '100%' }} ref={this.divRef} />;
  }
}
