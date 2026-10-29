#!/bin/sh
# สร้าง samnak-go.html (เนื้อหาอย่างเดียว) และ site/index.html (เอกสารเต็ม)
cd "$(dirname "$0")" || exit 1
mkdir -p site
{ cat head.html; echo '<script>'; cat engine.js data.js kata.js record-logic.js app.js deep.js report.js record-hooks.js records.js home.js ops-view.js; echo; echo '</script>'; } > samnak-go.html
{
cat <<'HEAD'
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#274690">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg">
<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>
</head>
<body>
HEAD
cat samnak-go.html
printf '</body>\n</html>\n'
} > site/index.html
mkdir -p site/records
cp ../records/bot-games.json site/records/bot-games.json
echo built
