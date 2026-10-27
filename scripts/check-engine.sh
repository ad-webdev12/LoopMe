#!/bin/sh
# Regenerates engine.json from the TypeScript engine, compiles the Swift port
# for macOS, and checks it against the TypeScript verdicts case by case.
set -e
cd "$(dirname "$0")/.."
node --experimental-strip-types --no-warnings scripts/export-engine.mjs
OUT="${TMPDIR:-/tmp}/loopme-engine-check"
mkdir -p "$OUT"
swiftc -O -o "$OUT/check" \
  ios/Shared/Engine/EngineTables.swift ios/Shared/Engine/Normalize.swift \
  ios/Shared/Engine/Links.swift ios/Shared/Engine/Features.swift \
  ios/Shared/Engine/Engine.swift ios/Shared/Engine/check/main.swift
LOOPME_ENGINE_JSON="$PWD/ios/Shared/Engine/engine.json" "$OUT/check" ios/Shared/Engine/cases.json
