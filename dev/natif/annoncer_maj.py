#!/usr/bin/env python3
"""Envoie la notification « Mise à jour disponible » à tous les comptes, une fois la nouvelle version en ligne.
Usage : SUPABASE_ACCESS_TOKEN=... python3 dev/natif/annoncer_maj.py "Texte facultatif"
(attend que GitHub Pages serve bien la version de dev/VERSION, puis appelle annoncer_mise_a_jour)."""
import json,os,sys,time,urllib.request,pathlib
REF='zrnhsdtpfyjlvrgrmssf'
ver=(pathlib.Path(__file__).resolve().parent.parent/'VERSION').read_text().strip()
texte=sys.argv[1] if len(sys.argv)>1 else ''
for i in range(30):
    try:
        v=json.load(urllib.request.urlopen(f'https://kngpa.github.io/Younity-/natif/version.json?t={time.time()}',timeout=20))['version']
        if v==ver:break
    except Exception:pass
    time.sleep(10)
else: sys.exit(f'La version {ver} n\'est pas encore en ligne.')
q="select annoncer_mise_a_jour('%s','%s') as n"%(ver.replace("'","''"),texte.replace("'","''"))
rq=urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query',data=json.dumps({'query':q}).encode(),
    headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'},method='POST')
print('Notification envoyée à',json.load(urllib.request.urlopen(rq,timeout=60))[0]['n'],'comptes pour la version',ver)
