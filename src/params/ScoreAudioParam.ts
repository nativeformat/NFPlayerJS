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

import { Command } from 'nf-grapher';
import { TimeInstant } from '../time';
import PseudoAudioParam = require('pseudo-audio-param');

interface ScoreAudioParamEvent {
  type: string;
  time: number;
}

export class ScoreAudioParam {
  constructor(
    initialValue: number,
    private param = new PseudoAudioParam(initialValue)
  ) {}

  // Proxy the few necessary calls to PseudoAudioParam for external
  // callers. Otherwise, most are not necessary.

  getValueAtTime(seconds: number): number {
    return this.param.getValueAtTime(seconds);
  }

  cancelScheduledValues(seconds: number) {
    return this.param.cancelScheduledValues(seconds);
  }

  get events() {
    // This cast avoid exposing the "internal" PseudoAudioParamEvent interface
    // beyond this package.
    return this.param.events as Readonly<ScoreAudioParamEvent[]>;
  }

  applyScoreCommands(source: Command[]) {
    for (let cmd of source) {
      this.applyScoreCommand(cmd);
    }
  }

  applyScoreCommand(cmd: Command) {
    const param = this.param;
    const apCommand = cmd as ScoreAudioParamCmd;
    if (apCommand.name === 'setValueAtTime') {
      const tcmd = apCommand as SetValueAtTimeCmd;
      const startTime = TimeInstant.fromNanos(tcmd.args.startTime);
      param.setValueAtTime(tcmd.args.value, startTime.asSeconds());
    } else if (apCommand.name === 'exponentialRampToValueAtTime') {
      const tcmd = apCommand as ExponentialRampToValueAtTimeCmd;
      const endTime = TimeInstant.fromNanos(tcmd.args.endTime);
      param.exponentialRampToValueAtTime(tcmd.args.value, endTime.asSeconds());
    } else if (apCommand.name === 'setTargetAtTime') {
      const tcmd = apCommand as SetTargetAtTimeCmd;
      const startTime = TimeInstant.fromNanos(tcmd.args.startTime);
      param.setTargetAtTime(
        tcmd.args.target,
        startTime.asSeconds(),
        tcmd.args.timeConstant
      );
    } else if (apCommand.name === 'linearRampToValueAtTime') {
      const tcmd = apCommand as LinearRampToValueAtTimeCmd;
      const endTime = TimeInstant.fromNanos(tcmd.args.endTime);
      param.linearRampToValueAtTime(tcmd.args.value, endTime.asSeconds());
    } else if (apCommand.name === 'setValueCurveAtTime') {
      const tcmd = apCommand as SetValueCurveAtTimeCmd;
      const startTime = TimeInstant.fromNanos(tcmd.args.startTime);
      const duration = TimeInstant.fromNanos(tcmd.args.duration);
      param.setValueCurveAtTime(
        tcmd.args.values,
        startTime.asSeconds(),
        duration.asSeconds()
      );
    } else {
      const exhausitve: never = apCommand;
    }
  }
}

export interface SetValueAtTimeCmd {
  name: 'setValueAtTime';
  args: {
    value: number;
    startTime: number;
  };
}

export interface ExponentialRampToValueAtTimeCmd {
  name: 'exponentialRampToValueAtTime';
  args: {
    value: number;
    endTime: number;
  };
}

export interface LinearRampToValueAtTimeCmd {
  name: 'linearRampToValueAtTime';
  args: {
    value: number;
    endTime: number;
  };
}

export interface SetTargetAtTimeCmd {
  name: 'setTargetAtTime';
  args: {
    target: number;
    startTime: number;
    timeConstant: number;
  };
}

export interface SetValueCurveAtTimeCmd {
  name: 'setValueCurveAtTime';
  args: {
    values: number[];
    startTime: number;
    duration: number;
  };
}

export type ScoreAudioParamCmd =
  | SetTargetAtTimeCmd
  | SetValueAtTimeCmd
  | SetValueCurveAtTimeCmd
  | LinearRampToValueAtTimeCmd
  | ExponentialRampToValueAtTimeCmd;
