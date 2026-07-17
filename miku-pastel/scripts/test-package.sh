#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common.sh"

TEST_PARENT="false"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --parent) TEST_PARENT="true"; shift ;;
    *) fail "未知参数：$1" ;;
  esac
done

validate_package

while IFS= read -r file; do
  /bin/bash -n "$file"
done < <(
  /usr/bin/find "$PACKAGE_ROOT/scripts" "$PACKAGE_ROOT" -maxdepth 2 \
    -type f \( -name '*.sh' -o -name '*.command' \) -print
)

image_name="$(theme_image_name)"
/usr/bin/cmp -s "$THEME_JSON" "$ENGINE_ROOT/assets/theme.json" \
  || fail "theme/theme.json 与完整引擎快照不一致，请运行 scripts/sync-engine.sh。"
/usr/bin/cmp -s "$ASSET_ROOT/$image_name" "$ENGINE_ROOT/assets/$image_name" \
  || fail "运行时背景与完整引擎快照不一致，请运行 scripts/sync-engine.sh。"

while IFS= read -r overlay_file; do
  relative="${overlay_file#$ENGINE_OVERLAY_ROOT/}"
  [ -f "$ENGINE_ROOT/$relative" ] || fail "完整引擎缺少 overlay 文件：$relative"
  /usr/bin/cmp -s "$overlay_file" "$ENGINE_ROOT/$relative" \
    || fail "engine-overlay/$relative 与完整引擎快照不一致。"
done < <(/usr/bin/find "$ENGINE_OVERLAY_ROOT" -type f -print)

"$ENGINE_ROOT/tests/run-tests.sh"
if [ "$TEST_PARENT" = "true" ]; then
  [ -x "$PARENT_ENGINE_ROOT/tests/run-tests.sh" ] || fail "上级仓库缺少 macos 测试。"
  /usr/bin/cmp -s "$THEME_JSON" "$PARENT_ENGINE_ROOT/assets/theme.json" \
    || fail "theme/theme.json 与上级 macos 主题配置不一致。"
  /usr/bin/cmp -s "$ASSET_ROOT/$image_name" "$PARENT_ENGINE_ROOT/assets/$image_name" \
    || fail "运行时背景与上级 macos 资源不一致。"
  while IFS= read -r overlay_file; do
    relative="${overlay_file#$ENGINE_OVERLAY_ROOT/}"
    [ -f "$PARENT_ENGINE_ROOT/$relative" ] || fail "上级 macos 缺少 overlay 文件：$relative"
    /usr/bin/cmp -s "$overlay_file" "$PARENT_ENGINE_ROOT/$relative" \
      || fail "engine-overlay/$relative 与上级 macos 不一致。"
  done < <(/usr/bin/find "$ENGINE_OVERLAY_ROOT" -type f -print)
  "$PARENT_ENGINE_ROOT/tests/run-tests.sh"
fi

note "主题包、配置、资源校验、脚本语法和引擎测试全部通过。"
