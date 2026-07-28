#!/usr/bin/env bats
# Tests for ralph-to-ralph.sh (the three-phase pipeline entry point).
#
# The phase scripts are replaced by stubs that record the arguments they were
# handed — this is where the QA argument-order bug lived.
# Run with: npx bats ralph_to_ralph/ralph-to-ralph.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph_to_ralph"
  cp "$BATS_TEST_DIRNAME/ralph-to-ralph.sh" "$REPO/ralph_to_ralph/"

  export INSPECT_ARGS="$REPO/inspect-args.txt"
  export BUILD_ARGS="$REPO/build-args.txt"
  export QA_ARGS="$REPO/qa-args.txt"

  for phase in inspect build qa; do
    upper=$(echo "$phase" | tr '[:lower:]' '[:upper:]')
    cat > "$REPO/ralph_to_ralph/ralph-$phase.sh" <<STUB
#!/bin/bash
printf '%s\n' "\$@" >> "\$${upper}_ARGS"
exit \${${upper}_RC:-0}
STUB
    chmod +x "$REPO/ralph_to_ralph/ralph-$phase.sh"
  done
}

@test "requires a target url" {
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "creates the per-phase state namespaces and screenshot dir" {
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com 1 1 1
  [ "$status" -eq 0 ]
  for phase in inspect build qa; do
    [ -d "$REPO/ralph_to_ralph/.state/progress/$phase" ]
    [ -d "$REPO/ralph_to_ralph/.state/logs/$phase" ]
  done
  [ -d "$REPO/screenshots" ]
}

@test "seeds prd.json when absent and leaves an existing one alone" {
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com 1 1 1
  [ "$(cat "$REPO/prd.json")" = "[]" ]

  echo '[{"id":"f1"}]' > "$REPO/prd.json"
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com 1 1 1
  [ "$(cat "$REPO/prd.json")" = '[{"id":"f1"}]' ]
}

@test "runs the three phases in order" {
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com 1 1 1
  [ "$status" -eq 0 ]
  [ -f "$INSPECT_ARGS" ]
  [ -f "$BUILD_ARGS" ]
  [ -f "$QA_ARGS" ]
  [[ "$output" == *"Phase 1: Inspect"* ]]
  [[ "$output" == *"Phase 2: Build"* ]]
  [[ "$output" == *"Phase 3: QA"* ]]
}

@test "hands inspect the target url and its iteration budget" {
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com 3 4 5
  [ "$(sed -n 1p "$INSPECT_ARGS")" = "https://example.com" ]
  [ "$(sed -n 2p "$INSPECT_ARGS")" = "3" ]
}

@test "hands build only its iteration budget" {
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com 3 4 5
  [ "$(sed -n 1p "$BUILD_ARGS")" = "4" ]
}

@test "hands QA the target url first and the iteration budget second" {
  # Regression: QA used to receive the iteration count as $1, which
  # ralph-qa.sh reads as TARGET_URL — "5" became the target product URL and
  # the iteration budget silently fell back to its 999 default.
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com 3 4 5
  [ "$(sed -n 1p "$QA_ARGS")" = "https://example.com" ]
  [ "$(sed -n 2p "$QA_ARGS")" = "5" ]
}

@test "defaults every phase budget to 999" {
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com
  [ "$(sed -n 2p "$INSPECT_ARGS")" = "999" ]
  [ "$(sed -n 1p "$BUILD_ARGS")" = "999" ]
  [ "$(sed -n 2p "$QA_ARGS")" = "999" ]
}

@test "a failing phase stops the pipeline" {
  export BUILD_RC=1
  run "$REPO/ralph_to_ralph/ralph-to-ralph.sh" https://example.com 1 1 1
  [ "$status" -ne 0 ]
  [ ! -f "$QA_ARGS" ]
}
