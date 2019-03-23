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
import { ScoreAudioParam } from './params/ScoreAudioParam';

export type Mutation = PushCommandsMutation | ClearCommandsMutation;

export enum MutationNames {
  PushCommands = 'PUSH_COMMANDS',
  ClearCommands = 'CLEAR_COMMANDS'
}

export type MutationBase = {
  name: MutationNames;
};

export type PushCommandsMutation = {
  graphId?: string;
  nodeId: string;
  paramName: string;
  commands: Array<Command>;
} & MutationBase;

// removes ALL commands, you better follow up with a replacement!
export type ClearCommandsMutation = {
  graphId?: string;
  nodeId: string;
  paramName: string;
} & MutationBase;

export type CommandsMutation = PushCommandsMutation | ClearCommandsMutation;

export function applyMutationToParam(
  effect: Mutation,
  param: ScoreAudioParam,
  commands: Command[]
) {
  switch (effect.name) {
    case MutationNames.ClearCommands: {
      commands.length = 0;
      param.cancelScheduledValues(0);
      return Promise.resolve();
    }

    case MutationNames.PushCommands: {
      // aka cast the effect to the specialized type, since we know via the
      // enum that it must be.
      const mutation = <PushCommandsMutation>effect;
      commands.push(...mutation.commands);
      // Cancel everything, then reapply everything.
      param.cancelScheduledValues(0);
      param.applyScoreCommands(commands);
      return Promise.resolve();
    }

    default: {
      const exhaustive: never = effect.name;
      return Promise.reject();
    }
  }
}
