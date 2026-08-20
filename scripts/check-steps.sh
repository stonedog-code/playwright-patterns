#!/usr/bin/env bash
# check-steps.sh — fail if any Gherkin sentence has no step definition.
#
# `cucumber-js --dry-run` REPORTS undefined and ambiguous steps and then exits
# 0 anyway — with or without `--strict`, which only covers *pending* steps.
# So the bare dry-run is useless as a merge gate: it prints "1 undefined" in
# yellow and CI, which keys on the exit code, calls it a pass.
#
# This wrapper reads the summary instead, and fails on:
#   - undefined steps  (a sentence no definition matches)
#   - ambiguous steps  (a sentence more than one definition matches)
#   - ZERO scenarios   (the empty-set case: a config or path change that stops
#                       matching any .feature file would otherwise report a
#                       clean run over nothing at all)

set -uo pipefail
cd "$(dirname "$0")/.."

out=$(NODE_OPTIONS='--import tsx' npx cucumber-js --dry-run 2>&1)
status=$?
printf '%s\n' "$out"

if [ $status -ne 0 ]; then
  printf '\ncheck-steps: cucumber-js itself failed (exit %s)\n' "$status" >&2
  exit $status
fi

summary=$(printf '%s' "$out" | grep -E '^[0-9]+ scenarios' | tail -1)
if [ -z "$summary" ]; then
  printf '\ncheck-steps: no scenario summary in the output — did cucumber-js run?\n' >&2
  exit 1
fi

count=$(printf '%s' "$summary" | grep -oE '^[0-9]+')
if [ "${count:-0}" -eq 0 ]; then
  printf '\ncheck-steps: 0 scenarios examined. A gate that inspects nothing is not a gate.\n' >&2
  exit 1
fi

if printf '%s' "$out" | grep -qE 'undefined|ambiguous'; then
  printf '\ncheck-steps: FAILED — undefined or ambiguous steps above. Every Gherkin\n' >&2
  printf 'sentence must resolve to exactly one step definition.\n' >&2
  exit 1
fi

printf '\ncheck-steps: OK — %s scenarios, every step resolves.\n' "$count"
