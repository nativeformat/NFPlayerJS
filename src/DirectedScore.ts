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

import { Edge, Score, Node, TypedNode, Graph } from 'nf-grapher';

// Serious Bug in Grapher: Score.Graph.Nodes is of type Node[], but _could_ be TypedNode[]!
// Note: I recall that this is by design, but this should be changed. It makes using a Score
// very difficult / runtime-error-prone.

export class DirectedScore {
  constructor(private score: Score = new Score()) {}

  graphId() {
    return this.score.graph.id;
  }

  toJSON() {
    return this.score;
  }

  incomingEdges(id: string): Edge[];
  incomingEdges(node: Node): Edge[];
  incomingEdges(nodeOrId: string | Node) {
    const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
    const edges = this.score.graph.edges.filter(edge => edge.target === id);
    return edges;
  }

  outgoingEdges(id: string): Edge[];
  outgoingEdges(node: Node): Edge[];
  outgoingEdges(nodeOrId: string | Node): Edge[] {
    const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
    const edges = this.score.graph.edges.filter(edge => edge.source === id);
    return edges;
  }

  leaves(): Node[] {
    const leaves = [];
    for (let node of this.score.graph.nodes) {
      const edges = this.outgoingEdges(node);
      if (edges.length === 0) {
        leaves.push(node);
      }
    }
    return leaves;
  }

  source(edge: Edge): Node | undefined {
    const node = this.score.graph.nodes.find(n => edge.source === n.id);
    return node;
  }

  target(edge: Edge): Node | undefined {
    const node = this.score.graph.nodes.find(n => edge.target === n.id);
    return node;
  }

  byId(id: string): Node | undefined {
    const node = this.score.graph.nodes.find(n => n.id === id);
    return node;
  }
}
