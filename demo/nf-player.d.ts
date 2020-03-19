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

// This file was generated.
// Steps from the root dir:
// npm install dts-bundle-generator
// node_modules/.bin/dts-bundle-generator --out-file demo/nf-player.d.ts ./src/index.ts --project ./tsconfig.json

// And then a few modifications, mostly to remove the "duplicate" definitions
// of Score/Graph as interfaces and classes. Interfaces become IScore/IGraph.

import { Command, Score } from 'nf-grapher';

export declare class TimeInstant {
  protected nanos: number;
  static fromNanos(nanos: number): TimeInstant;
  static fromMillis(ms: number): TimeInstant;
  static fromSeconds(seconds: number): TimeInstant;
  static fromSamples(samples: number, hz: number): TimeInstant;
  static from(instant: TimeInstant): TimeInstant;
  static max(time1: TimeInstant, time2: TimeInstant): TimeInstant;
  static min(time1: TimeInstant, time2: TimeInstant): TimeInstant;
  static readonly ZERO: TimeInstant;
  constructor(nanos?: number);
  asSeconds(): number;
  asMillis(): number;
  asNanos(): number;
  asSamples(hz: number): number;
  sub(time: TimeInstant): TimeInstant;
  add(time: TimeInstant): TimeInstant;
  scale(factor: number): TimeInstant;
  mod(factor: number): TimeInstant;
  mul(time: TimeInstant): number;
  div(time: TimeInstant): number;
  gt(time: TimeInstant): boolean;
  gte(time: TimeInstant): boolean;
  lt(time: TimeInstant): boolean;
  lte(time: TimeInstant): boolean;
  eq(time: TimeInstant): boolean;
  neq(time: TimeInstant): boolean;
}
export interface PseudoAudioParamEvent {
  type: string;
  time: number;
}
declare class PseudoAudioParam {
  public events: PseudoAudioParamEvent[];

  /**
   * WARNING: This property is not actually in the impl! Only to facilitate
   * casting to AudioParam.
   */
  public readonly defaultValue: number;

  /**
   * WARNING: This property is not actually in the impl! Only to facilitate
   * casting to AudioParam.
   */
  public readonly value: number;

  constructor(defaultValue: number);

  /** return scheduled value at time */
  getValueAtTime(time: number): number;

  /** apply scheduled methods to the provided audioParam. If reset is `true`,
   * cancel all events of AudioParam before applying */
  applyTo(audioParam: AudioParam, reset: boolean): PseudoAudioParam;

  setValueAtTime(value: number, time: number): PseudoAudioParam;
  linearRampToValueAtTime(value: number, time: number): PseudoAudioParam;
  exponentialRampToValueAtTime(value: number, time: number): PseudoAudioParam;
  setTargetAtTime(
    value: number,
    time: number,
    timeConstant: number
  ): PseudoAudioParam;
  setValueCurveAtTime(
    values: Float32Array,
    time: number,
    duration: number
  ): PseudoAudioParam;
  cancelScheduledValues(time: number): PseudoAudioParam;
  cancelAndHoldAtTime(time: number): PseudoAudioParam;
}
export interface ScoreAudioParamEvent {
  type: string;
  time: number;
}
export declare class ScoreAudioParam {
  private param;
  constructor(initialValue: number, param?: PseudoAudioParam);
  getValueAtTime(seconds: number): number;
  cancelScheduledValues(seconds: number): PseudoAudioParam;
  readonly events: ScoreAudioParamEvent[];
  applyScoreCommands(source: Command[]): void;
  applyScoreCommand(cmd: Command): void;
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
    values: Float32Array;
    startTime: number;
    duration: number;
  };
}
export declare type ScoreAudioParamCmd =
  | SetTargetAtTimeCmd
  | SetValueAtTimeCmd
  | SetValueCurveAtTimeCmd
  | LinearRampToValueAtTimeCmd
  | ExponentialRampToValueAtTimeCmd;
export declare type Mutation = PushCommandsMutation | ClearCommandsMutation;
export declare enum MutationNames {
  PushCommands = 'PUSH_COMMANDS',
  ClearCommands = 'CLEAR_COMMANDS'
}
export declare type MutationBase = {
  name: MutationNames;
};
export declare type PushCommandsMutation = {
  graphId?: string;
  nodeId: string;
  paramName: string;
  commands: Array<Command>;
} & MutationBase;
export declare type ClearCommandsMutation = {
  graphId?: string;
  nodeId: string;
  paramName: string;
} & MutationBase;
export declare type NodePlaybackDescription = {
  id: string;
  kind: string;
  time: TimeInstant;
  file?: {
    maxDuration: TimeInstant;
  };
  loop?: {
    loopsSinceStart: number;
    currentLoopStartTime: TimeInstant;
    currentLoopEndTime: TimeInstant;
    loopElapsedTime: TimeInstant;
    infinite: boolean;
  };
};
export declare class SmartPlayer {
  private ctx;
  private bufferSize;
  static DEFAULT_BUFFER_SIZE: number;
  private renderer;
  constructor(ctx?: AudioContext, bufferSize?: number);
  setJson(json: string): Promise<void>;
  getJson(graphId?: string): string;
  playing: boolean;
  renderTime: TimeInstant;
  getPlaybackDescription(renderTime: TimeInstant): NodePlaybackDescription[];
  enqueueMutation(effect: Mutation): Promise<{}>;
  enqueueScore(score: string): Promise<void>;
  enqueueScore(score: Score): Promise<void>;
  dequeueScore(graphId: string): Promise<{}>;
  private timeChange;
}
