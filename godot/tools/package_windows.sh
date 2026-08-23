#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
godot_bin="${GODOT_BIN:-godot}"
short_sha="${GITHUB_SHA:-local}"
short_sha="${short_sha:0:8}"
release_dir="${project_root}/release"
staging_dir="${release_dir}/windows"
artifact="starwreck-godot-scn-g01-00-windows-${short_sha}.zip"

mkdir -p "$staging_dir"
"$godot_bin" --headless --path "${project_root}/godot" --export-release "Windows Desktop" "${staging_dir}/starwreck-godot-scn-g01-00.exe"
cp "${project_root}/godot/README.md" "${staging_dir}/README.txt"
(cd "$staging_dir" && find . -type f -printf '%P\n' | LC_ALL=C sort | zip -X -q "${release_dir}/${artifact}" -@)
(cd "$release_dir" && sha256sum "$artifact" > "${artifact}.sha256")
printf '%s\n' "${release_dir}/${artifact}"

