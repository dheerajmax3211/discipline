#!/bin/bash
# usage: tools/encode.sh <renders dir>  -> public/vid/<key>.mp4 + <key>_0.jpg / _1.jpg (print thumbnails)
set -e
SRC="$1"; OUT="$(dirname "$0")/../public/vid"; mkdir -p "$OUT"
for d in "$SRC"/*/; do
  k=$(basename "$d")
  ffmpeg -y -loglevel error -framerate 10 -i "$d/%02d.png" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart "$OUT/$k.mp4"
  ffmpeg -y -loglevel error -i "$d/00.png" -vf scale=200:200 -q:v 4 "$OUT/${k}_0.jpg"
  ffmpeg -y -loglevel error -i "$d/18.png" -vf scale=200:200 -q:v 4 "$OUT/${k}_1.jpg"
done
