#!/usr/bin/env bats
# Tests for preflight.sh (.env validation before a run).
# Run with: npx bats scripts/preflight.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/scripts"
  cp "$BATS_TEST_DIRNAME/preflight.sh" "$REPO/scripts/"

  # The script sources .env into the environment — make sure a value inherited
  # from the developer's own shell can't mask a missing one.
  unset NEON_DATABASE_URL DASHBOARD_KEY RENDER_API_KEY RENDER_SERVICE_ID

  write_env() {
    : > "$REPO/.env"
    for pair in "$@"; do echo "$pair" >> "$REPO/.env"; done
  }

  full_env() {
    write_env \
      "NEON_DATABASE_URL=postgres://user:pw@host/db" \
      "DASHBOARD_KEY=dk_test" \
      "RENDER_API_KEY=rnd_test" \
      "RENDER_SERVICE_ID=srv-test"
  }
}

@test "passes when every credential is present" {
  full_env
  run "$REPO/scripts/preflight.sh"
  [ "$status" -eq 0 ]
  [[ "$output" == *"all checks passed"* ]]
}

@test "reports each credential it found" {
  full_env
  run "$REPO/scripts/preflight.sh"
  [[ "$output" == *"OK       NEON_DATABASE_URL"* ]]
  [[ "$output" == *"OK       DASHBOARD_KEY"* ]]
  [[ "$output" == *"OK       RENDER_API_KEY"* ]]
  [[ "$output" == *"OK       RENDER_SERVICE_ID"* ]]
}

@test "fails when .env is missing entirely" {
  run "$REPO/scripts/preflight.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"MISSING  .env"* ]]
  [[ "$output" == *"Pre-flight FAILED"* ]]
}

@test "fails and names the one credential that is missing" {
  write_env \
    "NEON_DATABASE_URL=postgres://user:pw@host/db" \
    "DASHBOARD_KEY=dk_test" \
    "RENDER_API_KEY=rnd_test"
  run "$REPO/scripts/preflight.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"MISSING  RENDER_SERVICE_ID"* ]]
  [[ "$output" == *"1 item(s) missing"* ]]
}

@test "counts every missing credential" {
  write_env "NEON_DATABASE_URL=postgres://user:pw@host/db"
  run "$REPO/scripts/preflight.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"3 item(s) missing"* ]]
}

@test "treats an empty value as missing" {
  write_env \
    "NEON_DATABASE_URL=postgres://user:pw@host/db" \
    "DASHBOARD_KEY=" \
    "RENDER_API_KEY=rnd_test" \
    "RENDER_SERVICE_ID=srv-test"
  run "$REPO/scripts/preflight.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"MISSING  DASHBOARD_KEY"* ]]
}

@test "points at the next step on success" {
  full_env
  run "$REPO/scripts/preflight.sh"
  [[ "$output" == *"Next:"* ]]
}
