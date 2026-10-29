const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const parts=['engine','data','kata','record-logic','app','deep','report','record-hooks','records','home','ops-view'];
const prefix='<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#274690">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon.svg">\n<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n</head>\n<body>\n';
const html=prefix+fs.readFileSync(path.join(root,'src/head.html'),'utf8')+'\n<script>\n'+parts.map(p=>fs.readFileSync(path.join(root,'src',p+'.js'),'utf8')).join('\n')+'\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('Built index.html');
