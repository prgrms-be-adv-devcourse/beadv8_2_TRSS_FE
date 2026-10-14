#!/bin/sh
# 디자인 캔버스 원본(.dc.html 폴더)에서 src/pages 를 다시 만들어요.
set -e
SRC="$1"
cd "$(dirname "$0")/.."
find src/pages -name '*.tsx' ! -name 'Screens.tsx' -delete
find src/pages -name '*.module.css' ! -name 'Screens.module.css' -delete
python3 tools/convert.py "$SRC" src/pages tools/logic
npx prettier --write "src/pages/**/*.{tsx,css}" > /dev/null
