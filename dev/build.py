#!/usr/bin/env python3
"""Construit l'application Younity (dossier dist/) à partir des écrans du prototype + la couche serveur."""
import re,os,shutil,json
import pathlib
H=pathlib.Path(__file__).resolve().parent
P=str(H/'ecrans')+'/';A=str(H)+'/';D=str(H.parent)+'/'
VER=open(A+'VERSION').read().strip()
_a=open(P+'app.js').read();_i=_a.index("const SPLASH='")+len("const SPLASH='");SPL=_a[_i:_a.index("';\n",_i)]
os.makedirs(D,exist_ok=True)
head=open(P+'head.html').read()
css=head[head.index('<style>')+7:head.index('</style>')]
fonts=''.join(f"@font-face{{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:{w};font-display:swap;src:url(vendor/fonts/plus-jakarta-sans-latin-{w}-normal.woff2) format('woff2')}}\n" for w in (400,500,600,700,800))
css=fonts+css+open(A+'src/app.css').read()
app=open(P+'app.js').read()
app=app[:app.index('/* ================== INIT')].replace('function vProfil(p){','function vProfil0(p){')
js='\n'.join([open(P+'logos.js').read(),app,open(P+'events.js').read(),open(P+'taches.js').read(),open(P+'recu.js').read(),open(P+'oubli.js').read(),open(P+'qrlib.js').read(),open(P+'qr.js').read(),open(A+'src/data.js').read(),f"window.YV='{VER}';showSplash=function(){{}};const SP_T0=Date.now();function hideSplash(){{const w=document.getElementById('spWrap');if(!w||w.dataset.out)return;w.dataset.out=1;const d=Math.max(0,3000-(Date.now()-SP_T0));setTimeout(()=>{{w.firstElementChild&&w.firstElementChild.classList.add('out');setTimeout(()=>w.remove(),600)}},d)}}setTimeout(hideSplash,20000);",open(A+'src/native.js').read(),'boot();'])
html=f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Younity</title>
<meta name="theme-color" content="#FFFFFF">
<meta name="description" content="Younity — Gestion des jeunes Harvest">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Younity">
<style>{css}</style>
<script src="vendor/supabase.js"></script><script src="vendor/lucide.min.js"></script><script src="vendor/xlsx.full.min.js" defer></script><script src="vendor/jspdf.umd.min.js" defer></script><script src="vendor/jsqr.min.js" defer></script>
</head><body class="app">
<div id="spWrap" style="position:fixed;inset:0;z-index:9999">{SPL}</div>
<script>try{{Capacitor.Plugins.SplashScreen.hide({{fadeOutDuration:250}})}}catch(e){{}}</script>
<div class="stage" id="stage"></div>
<div class="modal-bg" id="modalBg"><div class="modal" id="modal"></div></div>
<div class="toast" id="toast"></div>
<script>
{js}
if('serviceWorker' in navigator&&location.protocol==='https:'&&!NATIF)navigator.serviceWorker.register('sw.js').catch(()=>{{}});
</script></body></html>"""
open(D+'index.html','w').write(html)
for f in os.listdir(A+'vendor'):
    s=A+'vendor/'+f
    if os.path.isdir(s): shutil.copytree(s,D+'vendor/'+f,dirs_exist_ok=True)
    else: os.makedirs(D+'vendor',exist_ok=True);shutil.copy(s,D+'vendor/'+f)
for f in ('manifest.webmanifest','sw.js'):
    if os.path.exists(A+'src/'+f): shutil.copy(A+'src/'+f,D+f)
if os.path.isdir(A+'icons'): shutil.copytree(A+'icons',D+'icons',dirs_exist_ok=True)
print('ok',len(html)//1024,'Ko')
