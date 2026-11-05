#!/bin/bash
# 나무덤프 실행기
# 앱 묶음 안의 Resources/app/namudump.py를 파이썬으로 실행한다.
# 처음 실행할 때 독립 창에 쓰는 pywebview를 전용 가상 환경에 설치한다.

RES="$(cd "$(dirname "$0")/../Resources" && pwd)"
APPDIR="$RES/app"
SUP="$HOME/Library/Application Support/NamuDump"
VENV="$SUP/venv"
LOG="$SUP/namudump.log"
mkdir -p "$SUP"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.homebrew/bin:/usr/bin:/bin:$PATH"
# 앱 안에 __pycache__가 생기면 서명이 깨진다
export PYTHONDONTWRITEBYTECODE=1

say() { osascript -e "display notification \"$1\" with title \"나무덤프\"" >/dev/null 2>&1; }
alert() { osascript -e "display alert \"나무덤프\" message \"$1\" as critical" >/dev/null 2>&1; }

# pywebview 설치에 실패하면 이 시간(분) 동안은 다시 시도하지 않고 바로 브라우저로 연다.
# 시간이 지나면 다시 시도하므로, 인터넷이 없을 때 처음 열었어도 연결되면 독립 창이 생긴다.
RETRY_MINUTES=60
FAILED="$SUP/.skip-webview"
failed_recently() { [ -n "$(find "$FAILED" -mmin "-$RETRY_MINUTES" 2>/dev/null)" ]; }

ok_python() { [ -x "$1" ] && "$1" -c 'import sys, sqlite3, zlib; sys.exit(0 if sys.version_info >= (3, 8) else 1)' >/dev/null 2>&1; }

find_base_python() {
  for p in /opt/homebrew/bin/python3 /usr/local/bin/python3 "$HOME/.homebrew/bin/python3" \
           /Library/Frameworks/Python.framework/Versions/Current/bin/python3 /usr/bin/python3; do
    if ok_python "$p"; then echo "$p"; return 0; fi
  done
  return 1
}

PY=""
if ok_python "$VENV/bin/python3" && "$VENV/bin/python3" -c 'import webview' >/dev/null 2>&1; then
  PY="$VENV/bin/python3"
else
  BASE="$(find_base_python)"
  if [ -z "$BASE" ]; then
    alert "Python 3을 찾지 못했습니다. 터미널에서 xcode-select --install 을 실행하거나 python.org에서 Python을 설치한 뒤 다시 열어 주세요."
    exit 1
  fi
  PY="$BASE"
  if ! failed_recently; then
    say "처음 실행 준비 중입니다. 창 구성 요소를 설치하느라 1분쯤 걸릴 수 있습니다."
    {
      echo "== $(date) pywebview 설치 시작 ($BASE)"
      rm -rf "$VENV"
      "$BASE" -m venv "$VENV" && \
      "$VENV/bin/python3" -m pip install --disable-pip-version-check -q --retries 0 --timeout 10 --upgrade pip && \
      "$VENV/bin/python3" -m pip install --disable-pip-version-check -q --retries 0 --timeout 10 pywebview
    } >>"$LOG" 2>&1
    if "$VENV/bin/python3" -c 'import webview' >/dev/null 2>&1; then
      PY="$VENV/bin/python3"
      rm -f "$FAILED"
    else
      echo "pywebview 설치 실패. 브라우저 창으로 엽니다(${RETRY_MINUTES}분 뒤 다시 시도)." >>"$LOG"
      touch "$FAILED"
    fi
  fi
fi

echo "== $(date) 실행: $PY" >>"$LOG"
exec "$PY" "$APPDIR/namudump.py" "$@" >>"$LOG" 2>&1
