#!/bin/bash
sed -n '21,30p' /tmp/clean-start.sh | cat -A
for n in 21 22 23 24 25 26 27 28 29 30; do
  head -n "$n" /tmp/clean-start.sh > /tmp/t.sh
  bash -n /tmp/t.sh 2>/dev/null && echo "ok_$n" || echo "fail_$n"
done
