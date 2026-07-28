#!/bin/bash
# Full pipeline: Inspect → Build → QA
set -e
cd "$(dirname "$0")/.."

TARGET_URL="${1:?Usage: $0 <target-url> [inspect-iters] [build-iters] [qa-iters]}"
INSPECT_ITERS="${2:-999}"
BUILD_ITERS="${3:-999}"
QA_ITERS="${4:-999}"

echo "========================================="
echo "  RALPH-TO-RALPH: Product Cloner"
echo "========================================="
echo "Target:           $TARGET_URL"
echo "Inspect iters:    $INSPECT_ITERS"
echo "Build iters:      $BUILD_ITERS"
echo "QA iters:         $QA_ITERS"
echo "========================================="
echo ""

# Per-phase state: one journal file per iteration, plus that phase's transcripts.
mkdir -p ralph_to_ralph/.state/progress/{inspect,build,qa} ralph_to_ralph/.state/logs/{inspect,build,qa}
mkdir -p screenshots

# Initialize PRD if not exists
if [ ! -f "prd.json" ]; then
  echo '[]' > prd.json
fi

echo ">>> Phase 1: Inspect (Ever CLI + Claude)"
echo ""
./ralph_to_ralph/ralph-inspect.sh "$TARGET_URL" "$INSPECT_ITERS"

echo ""
echo ">>> Phase 2: Build (Claude)"
echo ""
./ralph_to_ralph/ralph-build.sh "$BUILD_ITERS"

echo ""
echo ">>> Phase 3: QA (Claude as independent evaluator)"
echo ""
# ralph-qa.sh takes <target-url> [iterations] — passing only the iteration count
# made "999" the target URL and silently left iterations at the 999 default.
./ralph_to_ralph/ralph-qa.sh "$TARGET_URL" "$QA_ITERS"

echo ""
echo "========================================="
echo "  RALPH-TO-RALPH: Complete!"
echo "========================================="
echo "  PRD: prd.json"
echo "  Spec: spec-build.md"
echo "  QA Report: report-qa.json"
echo "========================================="
