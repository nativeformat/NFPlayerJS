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
// Steps from the nf-grapher repo:
// cd js
// npm install dts-bundle-generator
// node_modules/.bin/dts-bundle-generator --out-file nf-grapher.d.ts src/index.ts

// And then a few modifications, mostly to remove the "duplicate" definitions
// of Score/Graph as interfaces and classes. Interfaces become IScore/IGraph.

export interface IScore {
  graph: Graph;
  version: string;
}
export interface IGraph {
  id: string;
  loadingPolicy?: LoadingPolicy;
  nodes?: Node[];
  edges?: Edge[];
  scripts?: Script[];
}
export interface Edge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
}
export declare enum LoadingPolicy {
  AllContentPlaythrough = 'allContentPlaythrough',
  SomeContentPlaythrough = 'someContentPlaythrough'
}
export interface Node {
  id: string;
  kind: string;
  loadingPolicy?: LoadingPolicy;
  params?: {
    [key: string]: Command[];
  };
  config?: {
    [key: string]: any;
  };
}
export interface Command {
  name: string;
  args?: {
    [key: string]: any;
  };
}
export interface Script {
  name: string;
  code: string;
}
/**
 * Signal types.
 */
export declare enum ContentType {
  AUDIO = 'com.nativeformat.content.audio'
}
export declare class Graph implements IGraph {
  id: string;
  loadingPolicy: LoadingPolicy;
  nodes: Node[];
  edges: Edge[];
  scripts: Script[];
  constructor(
    id?: string,
    loadingPolicy?: LoadingPolicy,
    nodes?: Node[],
    edges?: Edge[],
    scripts?: Script[]
  );
  static from(graph: IGraph): Graph;
}
export declare class Score implements IScore {
  graph: Graph;
  version: string;
  constructor(graph?: Graph, version?: string);
  static from(score: IScore): Score;
}
export abstract class TypedNode {
  readonly id: string;
  readonly kind: string;
  constructor(id: string, kind: string);
  toNode(): Node;
  toJSON(): Node;
  /**
   * @deprecated use `connectToTarget` or `connectToSource` instead.
   */
  connect(target: TypedNode): Edge;
  /**
   * Creates an edge from this node to the target node.
   * @param target Target node.
   */
  connectToTarget(target: TypedNode): Edge;
  /**
   * Creates an edge from the target node to this node.
   * @param source Source node.
   */
  connectToSource(source: TypedNode): Edge;
  getInputs(): Map<string, ContentType>;
  getOutputs(): Map<string, ContentType>;
  protected getConfig(): {
    [key: string]: any;
  };
  protected getParams(): {
    [key: string]: Command[];
  };
}
declare abstract class TypedParam<T> {
  readonly initialValue: T;
  constructor(initialValue: T);
  abstract getCommands(): Command[];
}
declare class ParamMapper<T extends TypedParam<any>> {
  readonly name: string;
  readonly factory: (cmds: Command[]) => T;
  constructor(name: string, factory: (cmds: Command[]) => T);
  create(): T;
  readParam(node: Node): T;
}
/**
 * AudioParam.
 */
export declare class AudioParam extends TypedParam<number> {
  private commands;
  /**
   * Creates a new `AudioParam` instance.
   */
  constructor(initialValue: number, commands?: Command[]);
  /**
   * Creates a new AudioParam mapper.
   */
  static newParamMapper(
    name: string,
    initialValue: number
  ): ParamMapper<AudioParam>;
  /**
   * Sets the value of this param at the given start time.
   */
  setValueAtTime(value: number, startTime: number): AudioParam;
  /**
   * Linearly interpolates the param from its current value to the give value at the given time.
   */
  linearRampToValueAtTime(value: number, endTime: number): AudioParam;
  /**
   * Exponentially interpolates the param from its current value to the give value at the given time.
   */
  exponentialRampToValueAtTime(value: number, endTime: number): AudioParam;
  /**
   * Specifies a target to reach starting at a given time and gives a constant with which to guide the curve along.
   */
  setTargetAtTime(
    target: number,
    startTime: number,
    timeConstant: number
  ): AudioParam;
  /**
   * Specifies a curve to render based on the given float values.
   */
  setValueCurveAtTime(
    values: Float32Array,
    startTime: number,
    duration: number
  ): AudioParam;
  /**
   * Returns an array of all commands added to this param.
   */
  getCommands(): Command[];
}
/**
 * Eq3bandNode.
 */
export declare class Eq3bandNode extends TypedNode {
  readonly lowCutoff: AudioParam;
  readonly midFrequency: AudioParam;
  readonly highCutoff: AudioParam;
  readonly lowGain: AudioParam;
  readonly midGain: AudioParam;
  readonly highGain: AudioParam;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * `lowCutoff` param factory.
   */
  private static LOW_CUTOFF_PARAM;
  /**
   * `midFrequency` param factory.
   */
  private static MID_FREQUENCY_PARAM;
  /**
   * `highCutoff` param factory.
   */
  private static HIGH_CUTOFF_PARAM;
  /**
   * `lowGain` param factory.
   */
  private static LOW_GAIN_PARAM;
  /**
   * `midGain` param factory.
   */
  private static MID_GAIN_PARAM;
  /**
   * `highGain` param factory.
   */
  private static HIGH_GAIN_PARAM;
  /**
   * Creates a new `Eq3bandNode` instance.
   */
  constructor(
    id: string,
    lowCutoff: AudioParam,
    midFrequency: AudioParam,
    highCutoff: AudioParam,
    lowGain: AudioParam,
    midGain: AudioParam,
    highGain: AudioParam
  );
  /**
   * `Eq3bandNode` factory.
   */
  static create(id?: string): Eq3bandNode;
  /**
   * Creates a new `Eq3bandNode` from a score `Node`.
   */
  static from(node: Node): Eq3bandNode;
  /**
   * Params for this node.
   */
  getParams(): {
    [key: string]: Command[];
  };
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * FileNodeConfig.
 */
export interface FileNodeConfig {
  file: string;
  when?: number;
  duration?: number;
  offset?: number;
}
/**
 * FileNode.
 */
export declare class FileNode extends TypedNode {
  readonly file: string;
  readonly when: number;
  readonly duration: number;
  readonly offset: number;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `string` mapper for the `file` param.
   */
  private static FILE_CONFIG;
  /**
   * Creates a new `number` mapper for the `when` param.
   */
  private static WHEN_CONFIG;
  /**
   * Creates a new `number` mapper for the `duration` param.
   */
  private static DURATION_CONFIG;
  /**
   * Creates a new `number` mapper for the `offset` param.
   */
  private static OFFSET_CONFIG;
  /**
   * Creates a new `FileNode` instance.
   */
  constructor(
    id: string,
    file: string,
    when: number,
    duration: number,
    offset: number
  );
  /**
   * `FileNode` factory.
   */
  static create(config: FileNodeConfig, id?: string): FileNode;
  /**
   * Creates a new `FileNode` from a score `Node`.
   */
  static from(node: Node): FileNode;
  /**
   * Configs for this node.
   */
  getConfig(): FileNodeConfig;
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * NoiseNodeConfig.
 */
export interface NoiseNodeConfig {
  when?: number;
  duration?: number;
}
/**
 * NoiseNode.
 */
export declare class NoiseNode extends TypedNode {
  readonly when: number;
  readonly duration: number;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `number` mapper for the `when` param.
   */
  private static WHEN_CONFIG;
  /**
   * Creates a new `number` mapper for the `duration` param.
   */
  private static DURATION_CONFIG;
  /**
   * Creates a new `NoiseNode` instance.
   */
  constructor(id: string, when: number, duration: number);
  /**
   * `NoiseNode` factory.
   */
  static create(config: NoiseNodeConfig, id?: string): NoiseNode;
  /**
   * Creates a new `NoiseNode` from a score `Node`.
   */
  static from(node: Node): NoiseNode;
  /**
   * Configs for this node.
   */
  getConfig(): NoiseNodeConfig;
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * SilenceNodeConfig.
 */
export interface SilenceNodeConfig {
  when?: number;
  duration?: number;
}
/**
 * SilenceNode.
 */
export declare class SilenceNode extends TypedNode {
  readonly when: number;
  readonly duration: number;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `number` mapper for the `when` param.
   */
  private static WHEN_CONFIG;
  /**
   * Creates a new `number` mapper for the `duration` param.
   */
  private static DURATION_CONFIG;
  /**
   * Creates a new `SilenceNode` instance.
   */
  constructor(id: string, when: number, duration: number);
  /**
   * `SilenceNode` factory.
   */
  static create(config: SilenceNodeConfig, id?: string): SilenceNode;
  /**
   * Creates a new `SilenceNode` from a score `Node`.
   */
  static from(node: Node): SilenceNode;
  /**
   * Configs for this node.
   */
  getConfig(): SilenceNodeConfig;
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * LoopNodeConfig.
 */
export interface LoopNodeConfig {
  when: number;
  duration: number;
  loopCount?: number;
}
/**
 * LoopNode.
 */
export declare class LoopNode extends TypedNode {
  readonly when: number;
  readonly duration: number;
  readonly loopCount: number;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `number` mapper for the `when` param.
   */
  private static WHEN_CONFIG;
  /**
   * Creates a new `number` mapper for the `duration` param.
   */
  private static DURATION_CONFIG;
  /**
   * Creates a new `number` mapper for the `loopCount` param.
   */
  private static LOOP_COUNT_CONFIG;
  /**
   * Creates a new `LoopNode` instance.
   */
  constructor(id: string, when: number, duration: number, loopCount: number);
  /**
   * `LoopNode` factory.
   */
  static create(config: LoopNodeConfig, id?: string): LoopNode;
  /**
   * Creates a new `LoopNode` from a score `Node`.
   */
  static from(node: Node): LoopNode;
  /**
   * Configs for this node.
   */
  getConfig(): LoopNodeConfig;
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * StretchNode.
 */
export declare class StretchNode extends TypedNode {
  readonly pitchRatio: AudioParam;
  readonly stretch: AudioParam;
  readonly formantRatio: AudioParam;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * `pitchRatio` param factory.
   */
  private static PITCH_RATIO_PARAM;
  /**
   * `stretch` param factory.
   */
  private static STRETCH_PARAM;
  /**
   * `formantRatio` param factory.
   */
  private static FORMANT_RATIO_PARAM;
  /**
   * Creates a new `StretchNode` instance.
   */
  constructor(
    id: string,
    pitchRatio: AudioParam,
    stretch: AudioParam,
    formantRatio: AudioParam
  );
  /**
   * `StretchNode` factory.
   */
  static create(id?: string): StretchNode;
  /**
   * Creates a new `StretchNode` from a score `Node`.
   */
  static from(node: Node): StretchNode;
  /**
   * Params for this node.
   */
  getParams(): {
    [key: string]: Command[];
  };
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * DelayNode.
 */
export declare class DelayNode extends TypedNode {
  readonly delayTime: AudioParam;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * `delayTime` param factory.
   */
  private static DELAY_TIME_PARAM;
  /**
   * Creates a new `DelayNode` instance.
   */
  constructor(id: string, delayTime: AudioParam);
  /**
   * `DelayNode` factory.
   */
  static create(id?: string): DelayNode;
  /**
   * Creates a new `DelayNode` from a score `Node`.
   */
  static from(node: Node): DelayNode;
  /**
   * Params for this node.
   */
  getParams(): {
    [key: string]: Command[];
  };
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * GainNode.
 */
export declare class GainNode extends TypedNode {
  readonly gain: AudioParam;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * `gain` param factory.
   */
  private static GAIN_PARAM;
  /**
   * Creates a new `GainNode` instance.
   */
  constructor(id: string, gain: AudioParam);
  /**
   * `GainNode` factory.
   */
  static create(id?: string): GainNode;
  /**
   * Creates a new `GainNode` from a score `Node`.
   */
  static from(node: Node): GainNode;
  /**
   * Params for this node.
   */
  getParams(): {
    [key: string]: Command[];
  };
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * SineNodeConfig.
 */
export interface SineNodeConfig {
  frequency?: number;
  when?: number;
  duration?: number;
}
/**
 * SineNode.
 */
export declare class SineNode extends TypedNode {
  readonly frequency: number;
  readonly when: number;
  readonly duration: number;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `number` mapper for the `frequency` param.
   */
  private static FREQUENCY_CONFIG;
  /**
   * Creates a new `number` mapper for the `when` param.
   */
  private static WHEN_CONFIG;
  /**
   * Creates a new `number` mapper for the `duration` param.
   */
  private static DURATION_CONFIG;
  /**
   * Creates a new `SineNode` instance.
   */
  constructor(id: string, frequency: number, when: number, duration: number);
  /**
   * `SineNode` factory.
   */
  static create(config: SineNodeConfig, id?: string): SineNode;
  /**
   * Creates a new `SineNode` from a score `Node`.
   */
  static from(node: Node): SineNode;
  /**
   * Configs for this node.
   */
  getConfig(): SineNodeConfig;
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * FilterNodeFilterType.
 */
export declare enum FilterNodeFilterType {
  LOW_PASS = 'lowPass',
  HIGH_PASS = 'highPass',
  BAND_PASS = 'bandPass'
}
/**
 * FilterNodeConfig.
 */
export interface FilterNodeConfig {
  filterType?: FilterNodeFilterType;
}
/**
 * FilterNode.
 */
export declare class FilterNode extends TypedNode {
  readonly filterType: FilterNodeFilterType;
  readonly lowCutoff: AudioParam;
  readonly highCutoff: AudioParam;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `string` mapper for the `filterType` param.
   */
  private static FILTER_TYPE_CONFIG;
  /**
   * `lowCutoff` param factory.
   */
  private static LOW_CUTOFF_PARAM;
  /**
   * `highCutoff` param factory.
   */
  private static HIGH_CUTOFF_PARAM;
  /**
   * Creates a new `FilterNode` instance.
   */
  constructor(
    id: string,
    filterType: FilterNodeFilterType,
    lowCutoff: AudioParam,
    highCutoff: AudioParam
  );
  /**
   * `FilterNode` factory.
   */
  static create(config: FilterNodeConfig, id?: string): FilterNode;
  /**
   * Creates a new `FilterNode` from a score `Node`.
   */
  static from(node: Node): FilterNode;
  /**
   * Configs for this node.
   */
  getConfig(): FilterNodeConfig;
  /**
   * Params for this node.
   */
  getParams(): {
    [key: string]: Command[];
  };
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * CompressorNodeDetectionMode.
 */
export declare enum CompressorNodeDetectionMode {
  MAX = 'max',
  RMS = 'rms'
}
/**
 * CompressorNodeKneeMode.
 */
export declare enum CompressorNodeKneeMode {
  HARD = 'hard',
  SOFT = 'soft'
}
/**
 * CompressorNodeConfig.
 */
export interface CompressorNodeConfig {
  detectionMode?: CompressorNodeDetectionMode;
  kneeMode?: CompressorNodeKneeMode;
  cutoffs?: number[];
}
/**
 * CompressorNode.
 */
export declare class CompressorNode extends TypedNode {
  readonly detectionMode: CompressorNodeDetectionMode;
  readonly kneeMode: CompressorNodeKneeMode;
  readonly cutoffs: number[];
  readonly thresholdDb: AudioParam;
  readonly kneeDb: AudioParam;
  readonly ratioDb: AudioParam;
  readonly attack: AudioParam;
  readonly release: AudioParam;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `string` mapper for the `detectionMode` param.
   */
  private static DETECTION_MODE_CONFIG;
  /**
   * Creates a new `string` mapper for the `kneeMode` param.
   */
  private static KNEE_MODE_CONFIG;
  /**
   * Creates a new `number[]` mapper for the `cutoffs` param.
   */
  private static CUTOFFS_CONFIG;
  /**
   * `thresholdDb` param factory.
   */
  private static THRESHOLD_DB_PARAM;
  /**
   * `kneeDb` param factory.
   */
  private static KNEE_DB_PARAM;
  /**
   * `ratioDb` param factory.
   */
  private static RATIO_DB_PARAM;
  /**
   * `attack` param factory.
   */
  private static ATTACK_PARAM;
  /**
   * `release` param factory.
   */
  private static RELEASE_PARAM;
  /**
   * Creates a new `CompressorNode` instance.
   */
  constructor(
    id: string,
    detectionMode: CompressorNodeDetectionMode,
    kneeMode: CompressorNodeKneeMode,
    cutoffs: number[],
    thresholdDb: AudioParam,
    kneeDb: AudioParam,
    ratioDb: AudioParam,
    attack: AudioParam,
    release: AudioParam
  );
  /**
   * `CompressorNode` factory.
   */
  static create(config: CompressorNodeConfig, id?: string): CompressorNode;
  /**
   * Creates a new `CompressorNode` from a score `Node`.
   */
  static from(node: Node): CompressorNode;
  /**
   * Configs for this node.
   */
  getConfig(): CompressorNodeConfig;
  /**
   * Params for this node.
   */
  getParams(): {
    [key: string]: Command[];
  };
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * ExpanderNodeDetectionMode.
 */
export declare enum ExpanderNodeDetectionMode {
  MAX = 'max',
  RMS = 'rms'
}
/**
 * ExpanderNodeKneeMode.
 */
export declare enum ExpanderNodeKneeMode {
  HARD = 'hard',
  SOFT = 'soft'
}
/**
 * ExpanderNodeConfig.
 */
export interface ExpanderNodeConfig {
  detectionMode?: ExpanderNodeDetectionMode;
  kneeMode?: ExpanderNodeKneeMode;
  cutoffs?: number[];
}
/**
 * ExpanderNode.
 */
export declare class ExpanderNode extends TypedNode {
  readonly detectionMode: ExpanderNodeDetectionMode;
  readonly kneeMode: ExpanderNodeKneeMode;
  readonly cutoffs: number[];
  readonly thresholdDb: AudioParam;
  readonly kneeDb: AudioParam;
  readonly ratioDb: AudioParam;
  readonly attack: AudioParam;
  readonly release: AudioParam;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `string` mapper for the `detectionMode` param.
   */
  private static DETECTION_MODE_CONFIG;
  /**
   * Creates a new `string` mapper for the `kneeMode` param.
   */
  private static KNEE_MODE_CONFIG;
  /**
   * Creates a new `number[]` mapper for the `cutoffs` param.
   */
  private static CUTOFFS_CONFIG;
  /**
   * `thresholdDb` param factory.
   */
  private static THRESHOLD_DB_PARAM;
  /**
   * `kneeDb` param factory.
   */
  private static KNEE_DB_PARAM;
  /**
   * `ratioDb` param factory.
   */
  private static RATIO_DB_PARAM;
  /**
   * `attack` param factory.
   */
  private static ATTACK_PARAM;
  /**
   * `release` param factory.
   */
  private static RELEASE_PARAM;
  /**
   * Creates a new `ExpanderNode` instance.
   */
  constructor(
    id: string,
    detectionMode: ExpanderNodeDetectionMode,
    kneeMode: ExpanderNodeKneeMode,
    cutoffs: number[],
    thresholdDb: AudioParam,
    kneeDb: AudioParam,
    ratioDb: AudioParam,
    attack: AudioParam,
    release: AudioParam
  );
  /**
   * `ExpanderNode` factory.
   */
  static create(config: ExpanderNodeConfig, id?: string): ExpanderNode;
  /**
   * Creates a new `ExpanderNode` from a score `Node`.
   */
  static from(node: Node): ExpanderNode;
  /**
   * Configs for this node.
   */
  getConfig(): ExpanderNodeConfig;
  /**
   * Params for this node.
   */
  getParams(): {
    [key: string]: Command[];
  };
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * CompanderNodeDetectionMode.
 */
export declare enum CompanderNodeDetectionMode {
  MAX = 'max',
  RMS = 'rms'
}
/**
 * CompanderNodeKneeMode.
 */
export declare enum CompanderNodeKneeMode {
  HARD = 'hard',
  SOFT = 'soft'
}
/**
 * CompanderNodeConfig.
 */
export interface CompanderNodeConfig {
  detectionMode?: CompanderNodeDetectionMode;
  kneeMode?: CompanderNodeKneeMode;
  cutoffs?: number[];
}
/**
 * CompanderNode.
 */
export declare class CompanderNode extends TypedNode {
  readonly detectionMode: CompanderNodeDetectionMode;
  readonly kneeMode: CompanderNodeKneeMode;
  readonly cutoffs: number[];
  readonly compressorThresholdDb: AudioParam;
  readonly compressorKneeDb: AudioParam;
  readonly compressorRatioDb: AudioParam;
  readonly expanderThresholdDb: AudioParam;
  readonly expanderKneeDb: AudioParam;
  readonly expanderRatioDb: AudioParam;
  readonly attack: AudioParam;
  readonly release: AudioParam;
  /**
   * Unique identifier for the plugin kind this node represents.
   */
  static PLUGIN_KIND: string;
  /**
   * Creates a new `string` mapper for the `detectionMode` param.
   */
  private static DETECTION_MODE_CONFIG;
  /**
   * Creates a new `string` mapper for the `kneeMode` param.
   */
  private static KNEE_MODE_CONFIG;
  /**
   * Creates a new `number[]` mapper for the `cutoffs` param.
   */
  private static CUTOFFS_CONFIG;
  /**
   * `compressorThresholdDb` param factory.
   */
  private static COMPRESSOR_THRESHOLD_DB_PARAM;
  /**
   * `compressorKneeDb` param factory.
   */
  private static COMPRESSOR_KNEE_DB_PARAM;
  /**
   * `compressorRatioDb` param factory.
   */
  private static COMPRESSOR_RATIO_DB_PARAM;
  /**
   * `expanderThresholdDb` param factory.
   */
  private static EXPANDER_THRESHOLD_DB_PARAM;
  /**
   * `expanderKneeDb` param factory.
   */
  private static EXPANDER_KNEE_DB_PARAM;
  /**
   * `expanderRatioDb` param factory.
   */
  private static EXPANDER_RATIO_DB_PARAM;
  /**
   * `attack` param factory.
   */
  private static ATTACK_PARAM;
  /**
   * `release` param factory.
   */
  private static RELEASE_PARAM;
  /**
   * Creates a new `CompanderNode` instance.
   */
  constructor(
    id: string,
    detectionMode: CompanderNodeDetectionMode,
    kneeMode: CompanderNodeKneeMode,
    cutoffs: number[],
    compressorThresholdDb: AudioParam,
    compressorKneeDb: AudioParam,
    compressorRatioDb: AudioParam,
    expanderThresholdDb: AudioParam,
    expanderKneeDb: AudioParam,
    expanderRatioDb: AudioParam,
    attack: AudioParam,
    release: AudioParam
  );
  /**
   * `CompanderNode` factory.
   */
  static create(config: CompanderNodeConfig, id?: string): CompanderNode;
  /**
   * Creates a new `CompanderNode` from a score `Node`.
   */
  static from(node: Node): CompanderNode;
  /**
   * Configs for this node.
   */
  getConfig(): CompanderNodeConfig;
  /**
   * Params for this node.
   */
  getParams(): {
    [key: string]: Command[];
  };
  /**
   * Inputs for this node.
   */
  getInputs(): Map<string, ContentType>;
  /**
   * Outputs for this node.
   */
  getOutputs(): Map<string, ContentType>;
}
/**
 * Map of Node kinds to typed classes.
 */
export declare const NodeKinds: {
  'com.nativeformat.plugin.eq.eq3band': typeof Eq3bandNode;
  'com.nativeformat.plugin.file.file': typeof FileNode;
  'com.nativeformat.plugin.noise.noise': typeof NoiseNode;
  'com.nativeformat.plugin.noise.silence': typeof SilenceNode;
  'com.nativeformat.plugin.time.loop': typeof LoopNode;
  'com.nativeformat.plugin.time.stretch': typeof StretchNode;
  'com.nativeformat.plugin.waa.delay': typeof DelayNode;
  'com.nativeformat.plugin.waa.gain': typeof GainNode;
  'com.nativeformat.plugin.wave.sine': typeof SineNode;
  'com.nativeformat.plugin.eq.filter': typeof FilterNode;
  'com.nativeformat.plugin.compressor.compressor': typeof CompressorNode;
  'com.nativeformat.plugin.compressor.expander': typeof ExpanderNode;
  'com.nativeformat.plugin.compressor.compander': typeof CompanderNode;
};
/**
 * Computes the number of nanoseconds in the milliseconds given.
 */
export declare function millisToNanos(millis?: number): number;
/**
 * Computes the number of nanoseconds in the seconds given.
 */
export declare function secondsToNanos(seconds?: number): number;
/**
 * Computes the number of nanoseconds in the minutes given.
 */
export declare function minutesToNanos(minutes?: number): number;
