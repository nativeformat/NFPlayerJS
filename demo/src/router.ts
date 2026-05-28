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

/*
 * Hash-based deeplink router for the demo.
 *
 * Hash format: #<panel>[/<example-slug>]
 * Examples:   #code, #json/ratatat-forever, #visualizer
 */

export type PanelSlug = 'code' | 'json' | 'visualizer';

const PANEL_SLUGS: readonly PanelSlug[] = ['code', 'json', 'visualizer'];

export type Route = {
  panel: PanelSlug | undefined;
  exampleSlug: string | undefined;
};

export function parseHash(hash: string = window.location.hash): Route {
  const raw = hash.replace(/^#/, '');
  if (!raw) return { panel: undefined, exampleSlug: undefined };

  const [panelPart, ...rest] = raw.split('/');
  const panel = (PANEL_SLUGS as readonly string[]).includes(panelPart)
    ? (panelPart as PanelSlug)
    : undefined;
  const exampleSlug = rest.length > 0 ? rest.join('/') || undefined : undefined;

  return { panel, exampleSlug };
}

export function formatHash(route: Route): string {
  if (!route.panel) return '';
  return route.exampleSlug
    ? `#${route.panel}/${route.exampleSlug}`
    : `#${route.panel}`;
}

export function setRoute(route: Route): void {
  const next = formatHash(route);
  if (next === window.location.hash) return;
  // Using replaceState to not pollute history
  history.replaceState(
    null,
    '',
    next || window.location.pathname + window.location.search,
  );
}

export function subscribeRoute(fn: (route: Route) => void): () => void {
  const handler = () => fn(parseHash());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
