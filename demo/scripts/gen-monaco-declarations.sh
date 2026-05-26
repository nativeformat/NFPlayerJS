#!/bin/bash

echo "Generating monaco NF typeahead definitions..."

pnpm exec dts-bundle-generator --silent --no-banner --no-check \
  --project ../package.tsconfig.json \
  --external-inlines nf-grapher \
  --export-referenced-types \
  -o ./monaco-declarations/nf-grapher.d.ts -- \
  ./node_modules/nf-grapher/dist/module/index.d.ts

pnpm exec dts-bundle-generator --silent --no-banner --no-check \
  --project ../package.tsconfig.json \
  --external-inlines pseudo-audio-param soundtouch-ts nf-grapher \
  --export-referenced-types \
  -o ./monaco-declarations/nf-player.d.ts -- \
  ../src/index.ts

echo "Done."