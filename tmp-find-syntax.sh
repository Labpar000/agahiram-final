#!/bin/bash
for n in 20 30 40 50 55 58 59; do
  head -n "$n" /tmp/clean-start.sh > /tmp/t.sh
  if bash -n /tmp/t.sh 2>/dev/null; then
    echo "ok_$n"
  else
    echo "fail_$n"
    bash -n /tmp/t.sh 2>&1
  fi
done
