#!/bin/sh
set -e

APP_PORT=${APP_PORT:-8000}
if [ "${ENABLE_RELOAD:-true}" = "true" ]; then
  RELOAD_FLAG="--reload"
else
  RELOAD_FLAG=""
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT}" ${RELOAD_FLAG}
