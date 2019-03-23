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

export class TimeInstant {
  static fromNanos(nanos: number) {
    return new TimeInstant(nanos);
  }

  static fromMillis(ms: number) {
    return new TimeInstant(ms * 1e6);
  }

  static fromSeconds(seconds: number) {
    return new TimeInstant(seconds * 1e9);
  }

  static fromSamples(samples: number, hz: number) {
    return new TimeInstant((samples / hz) * 1e9);
  }

  static from(instant: TimeInstant) {
    return new TimeInstant(instant.asNanos());
  }

  static max(time1: TimeInstant, time2: TimeInstant) {
    if (time1.asNanos() > time2.asNanos()) return time1;
    else return time2;
  }

  static min(time1: TimeInstant, time2: TimeInstant) {
    if (time1.asNanos() < time2.asNanos()) return time1;
    else return time2;
  }

  static readonly ZERO = new TimeInstant(0);

  constructor(protected nanos: number = 0) {}

  asSeconds() {
    return this.nanos / 1e9;
  }

  asMillis() {
    return this.nanos / 1e6;
  }

  asNanos() {
    return Math.round(this.nanos);
  }

  asSamples(hz: number) {
    return this.nanos === 0 ? 0 : Math.round((this.nanos / 1e9) * hz);
  }

  sub(time: TimeInstant) {
    return TimeInstant.fromNanos(this.nanos - time.nanos);
  }

  add(time: TimeInstant) {
    return TimeInstant.fromNanos(this.nanos + time.nanos);
  }

  scale(factor: number) {
    return TimeInstant.fromNanos(this.nanos * factor);
  }

  mod(factor: number) {
    return TimeInstant.fromNanos(this.nanos % factor);
  }

  // These are weird when it comes to units! What is Time^2??
  mul(time: TimeInstant) {
    return this.nanos * time.nanos;
  }

  div(time: TimeInstant) {
    return this.nanos / time.nanos;
  }

  gt(time: TimeInstant) {
    return this.nanos > time.nanos;
  }

  gte(time: TimeInstant) {
    return this.nanos >= time.nanos;
  }

  lt(time: TimeInstant) {
    return this.nanos < time.nanos;
  }

  lte(time: TimeInstant) {
    return this.nanos <= time.nanos;
  }

  eq(time: TimeInstant) {
    return this.nanos === time.nanos;
  }

  neq(time: TimeInstant) {
    return this.nanos !== time.nanos;
  }
}
