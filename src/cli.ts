#!/usr/bin/env node
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

import 'cross-fetch/polyfill';
import * as Debug from 'debug';
import * as path from 'path';
import { SmartPlayer } from './SmartPlayer';
import { MemoryRenderer } from './renderers/MemoryRenderer';
import { RendererInfo } from './renderers/RendererInfo';
import { writeFile as FSWriteFile, readFile as FSReadFile } from 'fs';
import { exec as CPExec } from 'child_process';
import { promisify } from 'util';
import * as tempy from 'tempy';
import * as WavDecoder from 'wav-decoder';
import * as WavEncoder from 'wav-encoder';
import { XAudioBuffer } from './XAudioBuffer';
import { TimeInstant } from './time';
import { Score } from 'nf-grapher';

const exec = promisify(CPExec);
const writeFile = promisify(FSWriteFile);
const readFile = promisify(FSReadFile);

const dbg = Debug('nf:cli');
const dbgdecoder = Debug('nf:cli-decoder');

// Purposefully using `require` here because an `import` would cause TS to
// change the output folder to be `dist/src/cli.js` to allow `package.json`
// to exist in `dist/package.json`. We don't want TS to copy over package.json,
// and nor do we want anything from the root to be included in the `dist`
// folder.
const pkg = require('../package.json');

const showHelpAndExit = () => {
  console.log(`
Usage
  $ nf-player <command> [options]

Commands
  save

Global Options
  --input-file, -i                    The file path to the input Score JSON. (Required)
  --output-file, -o [nf-player.wav]   The file path to the output WAVE file.
  --duration, -d [60.0]               Scores can be infinite! Duration is in seconds.
  --seek, -s [0.0]                    Where to start rendering from.
  --quantum, -q [256]                 Size of the render quantum. A smaller value will
                                      produce more accurate Time Stretching and Pitch Shifting,
                                      but at the cost of CPU time.
  --version, -v                       The version of this library. ${pkg.version}
  --help, -h                          Display this help.

Examples
  # Render 30 seconds of a score to a wav file:
  $ nf-player-cli save --duration 30 -i ./score.json -o ./output.wav
`);
  process.exit(1);
};

type ParsedCLIFlags = {
  command: 'save';
  quantum: number;
  inputFile: string;
  outputFile: string;
  duration: number;
  seek: number;
};

function parseRawFlags(): ParsedCLIFlags {
  const parsed: ParsedCLIFlags = {
    command: parseBareArg({ name: ['save'] }),

    quantum: parseFlagArg({
      long: '--quantum',
      kind: 'number',
      alias: '-q',
      default: 256
    }),

    // cacheDir: parseArg({
    //   long: 'cache-dir',
    //   kind: 'string',
    //   alias: 'c',
    //   default: path.join(process.cwd(), '.nf-player-cli-cache'),
    // }),

    inputFile: parseFlagArg({
      long: '--input-file',
      kind: 'string',
      alias: '-i',
      required: true
    }),

    outputFile: parseFlagArg({
      long: '--output-file',
      kind: 'string',
      alias: '-o',
      default: path.join(process.cwd(), 'nf-player.wav')
    }),

    duration: parseFlagArg({
      long: '--duration',
      kind: 'number',
      alias: '-d',
      default: 60
    }),

    seek: parseFlagArg({
      long: '--seek',
      kind: 'number',
      alias: '-s',
      default: 0
    })
  };

  return parsed;
}

function go() {
  if (
    parseFlagArg({
      long: '--help',
      kind: 'boolean',
      alias: '-h'
    })
  )
    return showHelpAndExit();

  if (
    parseFlagArg({
      long: '--version',
      kind: 'boolean',
      alias: '-v',
      default: false
    })
  ) {
    console.log(pkg.version);
    return process.exit(1);
  }

  let flags;

  try {
    flags = parseRawFlags();
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }

  // TODO: add a `play` command for speaker playback.

  if (flags.command === 'save') {
    saveToFile(flags);
  } else {
    return showHelpAndExit();
  }
}

go();

async function saveToFile(flags: ParsedCLIFlags) {
  const { quantum, inputFile, duration, outputFile } = flags;
  const info: RendererInfo = {
    sampleRate: 44100,
    channelCount: 2,
    quantumSize: quantum,
    decode
  };
  const renderer = new MemoryRenderer(info);
  const player = new SmartPlayer(renderer);

  if (flags.seek > 0) {
    await player.seek(TimeInstant.fromSeconds(flags.seek));
  }

  const inputData = await readFile(inputFile, { encoding: 'utf8' });
  const rawScore = JSON.parse(inputData);
  // NFGrapher will fill in defaults, and do baseline validation of a Score.
  const s = Score.from(rawScore);
  await player.enqueueScore(s);
  player.playing = true;

  dbg('Rendering %f seconds of score...', duration);
  const output = renderer.renderDuration(TimeInstant.fromSeconds(duration));

  dbg('Encoding wav file');
  let channelData = [];
  for (let i = 0; i < output.numberOfChannels; i++) {
    channelData.push(output.getChannelData(i));
  }

  const encoded = await WavEncoder.encode({
    sampleRate: info.sampleRate,
    channelData
  });

  dbg('Writing as %s (%d bytes)', outputFile, encoded.byteLength);
  await writeFile(outputFile, new DataView(encoded));
}

function decode(uri: string, buffer: ArrayBuffer): Promise<XAudioBuffer> {
  return new Promise(async (resolve, reject) => {
    // Using an external ffmpeg is so hacky!
    // But soooo much easier than trying to stitch together the very
    // fragile and relatively out of date JS audio encoder/decoder
    // ecosystem.
    const inputName = tempy.file();
    const outputName = tempy.file();
    dbgdecoder('%s decode requested', uri);

    await writeFile(inputName, new DataView(buffer));
    dbgdecoder('%s wrote %s (%d bytes?)', uri, inputName, buffer.byteLength);

    dbgdecoder('%s transcoding wav %s -> %s', uri, inputName, outputName);
    await exec(`ffmpeg -i ${inputName} -f wav ${outputName}`);
    dbgdecoder('%s finished transcoding', uri);

    dbgdecoder('%s loading transcoded file', uri);
    const wavData = await readFile(outputName);
    dbgdecoder('%s loaded transcoded wav (%d bytes)', uri, wavData.byteLength);

    dbgdecoder('%s decoding wav', uri);
    const decoded = await WavDecoder.decode(wavData);
    dbgdecoder(
      '%s decoded into %d channels @ %dhz',
      uri,
      decoded.channelData.length,
      decoded.sampleRate
    );

    const audio = new XAudioBuffer({
      sampleRate: decoded.sampleRate,
      numberOfChannels: decoded.channelData.length,
      length: decoded.channelData[0].length
    });
    for (let i = 0; i < decoded.channelData.length; i++) {
      const chan = decoded.channelData[i];
      audio.copyToChannel(chan, i, 0);
    }
    resolve(audio);
  });
}

type StringToType<
  T extends 'string' | 'number' | 'boolean'
> = T extends 'string'
  ? string
  : T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : never;

function parseFlagArg<
  KindName extends 'string' | 'number' | 'boolean',
  Kind extends StringToType<KindName>
>(config: {
  long: string;
  alias: string;
  kind: KindName;
  default?: Kind;
  required?: boolean;
}): Kind {
  const longIdx = process.argv.indexOf(config.long);
  const shortIdx = process.argv.indexOf(config.alias);

  let value: any;

  if (longIdx > -1) {
    value = config.kind === 'boolean' ? true : process.argv[longIdx + 1];
  } else if (shortIdx > -1) {
    value = config.kind === 'boolean' ? true : process.argv[shortIdx + 1];
  } else {
    value = config.default;
  }

  if (config.required && value === undefined)
    throw new Error(
      `Required flag ${config.long} (${config.alias}) had no value.`
    );

  const parsed =
    config.kind === 'boolean'
      ? Boolean(value)
      : config.kind === 'number'
      ? Number(value)
      : String(value);
  return parsed as Kind;
}

function parseBareArg<Command extends string>(config: {
  name: Command[];
}): Command {
  let command: Command | undefined;
  for (let i = 0; i < config.name.length; i++) {
    const idx = process.argv.indexOf(config.name[i]);
    if (idx > -1) command = config.name[i];
  }

  if (command === undefined)
    throw new Error(`Required command "${config.name}" not provided.`);
  return command;
}
