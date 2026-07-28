#!/usr/bin/env bats
# Tests for render.sh (Render REST API wrapper).
#
# `curl` is replaced by a stub that serves canned JSON from $BODIES and returns
# $CURL_CODE, so no request leaves the machine.
# Run with: npx bats scripts/render.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/scripts" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/render.sh" "$REPO/scripts/"

  unset RENDER_API_KEY RENDER_SERVICE_ID

  export BODIES="$REPO/bodies"
  export CURL_ARGS="$REPO/curl-args.txt"
  mkdir -p "$BODIES"

  cat > "$REPO/bin/curl" <<'STUB'
#!/bin/bash
printf '%s\n' "$*" >> "$CURL_ARGS"
out=""; url=""; prev=""
for a in "$@"; do
  [ "$prev" = "-o" ] && out="$a"
  case "$a" in https://*) url="$a" ;; esac
  prev="$a"
done
body="$BODIES/default.json"
case "$url" in
  */deploys*)  [ -f "$BODIES/deploys.json" ]  && body="$BODIES/deploys.json" ;;
  */env-vars*) [ -f "$BODIES/env-vars.json" ] && body="$BODIES/env-vars.json" ;;
  */services/*) [ -f "$BODIES/service.json" ] && body="$BODIES/service.json" ;;
esac
[ -f "$body" ] || body=/dev/null
[ -n "$out" ] && cp "$body" "$out"
echo "${CURL_CODE:-200}"
STUB
  chmod +x "$REPO/bin/curl"
  PATH="$REPO/bin:$PATH"

  echo '{}' > "$BODIES/default.json"

  write_creds() {
    printf 'RENDER_API_KEY=rnd_test\nRENDER_SERVICE_ID=srv-test\n' > "$REPO/.env"
  }

  a_deploy() {
    cat > "$BODIES/deploys.json" <<'JSON'
[{"deploy":{"id":"dep-abc","status":"live","commit":{"id":"0123456789abcdef"},
  "createdAt":"2026-07-27T10:00:00Z","finishedAt":"2026-07-27T10:05:00Z"}}]
JSON
  }
}

@test "prints usage with no arguments" {
  run "$REPO/scripts/render.sh"
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage: ./scripts/render.sh"* ]]
}

@test "help lists every command" {
  run "$REPO/scripts/render.sh" help
  [ "$status" -eq 0 ]
  for cmd in deploy logs settings status; do
    [[ "$output" == *"$cmd"* ]]
  done
}

@test "rejects an unknown command with usage on stderr" {
  run "$REPO/scripts/render.sh" frobnicate
  [ "$status" -eq 1 ]
  [[ "$output" == *"Unknown command: frobnicate"* ]]
}

@test "help works without credentials" {
  run "$REPO/scripts/render.sh" help
  [ "$status" -eq 0 ]
  [ ! -f "$CURL_ARGS" ]
}

@test "fails clearly when .env is absent" {
  run "$REPO/scripts/render.sh" status
  [ "$status" -eq 1 ]
  [[ "$output" == *".env not found"* ]]
}

@test "names the credential missing from .env" {
  printf 'RENDER_API_KEY=rnd_test\n' > "$REPO/.env"
  run "$REPO/scripts/render.sh" status
  [ "$status" -eq 1 ]
  [[ "$output" == *"missing in ./.env: RENDER_SERVICE_ID"* ]]
}

@test "status summarizes the latest deploy" {
  write_creds
  a_deploy
  run "$REPO/scripts/render.sh" status
  [ "$status" -eq 0 ]
  [[ "$output" == *"Deploy     dep-abc"* ]]
  [[ "$output" == *"Status     live"* ]]
  [[ "$output" == *"Commit     0123456789ab"* ]]
}

@test "status reports a service with no deploys yet" {
  write_creds
  echo '[]' > "$BODIES/deploys.json"
  run "$REPO/scripts/render.sh" status
  [ "$status" -eq 0 ]
  [[ "$output" == *"no deploys yet"* ]]
}

@test "sends the api key as a bearer token" {
  write_creds
  a_deploy
  run "$REPO/scripts/render.sh" status
  grep -q "Authorization: Bearer rnd_test" "$CURL_ARGS"
}

@test "a 401 is reported as a credentials problem" {
  write_creds
  a_deploy
  export CURL_CODE=401
  run "$REPO/scripts/render.sh" status
  [ "$status" -eq 1 ]
  [[ "$output" == *"rejected the credentials"* ]]
}

@test "a 404 points at the service id" {
  write_creds
  a_deploy
  export CURL_CODE=404
  run "$REPO/scripts/render.sh" status
  [ "$status" -eq 1 ]
  [[ "$output" == *"RENDER_SERVICE_ID='srv-test' does not match"* ]]
}

@test "a 429 is reported as rate limiting" {
  write_creds
  a_deploy
  export CURL_CODE=429
  run "$REPO/scripts/render.sh" status
  [ "$status" -eq 1 ]
  [[ "$output" == *"rate limited"* ]]
}

@test "deploy refuses to run outside a git repository" {
  write_creds
  a_deploy
  run "$REPO/scripts/render.sh" deploy
  [ "$status" -eq 1 ]
  [[ "$output" == *"not a git repository"* ]]
}

@test "settings prints the service configuration" {
  write_creds
  cat > "$BODIES/service.json" <<'JSON'
{"id":"srv-test","name":"clone","type":"web_service","repo":"https://github.com/o/r",
 "branch":"main","ownerId":"tea-1","serviceDetails":{"runtime":"node","region":"oregon",
 "plan":"starter","url":"https://clone.onrender.com"}}
JSON
  echo '[]' > "$BODIES/env-vars.json"
  run "$REPO/scripts/render.sh" settings
  [ "$status" -eq 0 ]
  [[ "$output" == *"Name                  clone"* ]]
  [[ "$output" == *"Branch                main"* ]]
  [[ "$output" == *"URL                   https://clone.onrender.com"* ]]
}

@test "settings masks env var values by default" {
  write_creds
  cat > "$BODIES/service.json" <<'JSON'
{"id":"srv-test","name":"clone","ownerId":"tea-1","serviceDetails":{}}
JSON
  cat > "$BODIES/env-vars.json" <<'JSON'
[{"envVar":{"key":"DASHBOARD_KEY","value":"supersecretvalue"}}]
JSON
  run "$REPO/scripts/render.sh" settings
  [ "$status" -eq 0 ]
  [[ "$output" != *"supersecretvalue"* ]]
  [[ "$output" == *"su***"* ]]
  [[ "$output" == *"Values are masked"* ]]
}

@test "settings --show-values prints them in full" {
  write_creds
  cat > "$BODIES/service.json" <<'JSON'
{"id":"srv-test","name":"clone","ownerId":"tea-1","serviceDetails":{}}
JSON
  cat > "$BODIES/env-vars.json" <<'JSON'
[{"envVar":{"key":"DASHBOARD_KEY","value":"supersecretvalue"}}]
JSON
  run "$REPO/scripts/render.sh" settings --show-values
  [ "$status" -eq 0 ]
  [[ "$output" == *"supersecretvalue"* ]]
}

@test "logs rejects an unknown option" {
  write_creds
  run "$REPO/scripts/render.sh" logs --nonsense
  [ "$status" -eq 1 ]
  [[ "$output" == *"unknown option for logs: --nonsense"* ]]
}
