#!/usr/bin/env python3
"""Envoie la notification « Mise à jour disponible » à tous les comptes, une fois la nouvelle version en ligne.
Usage : SUPABASE_ACCESS_TOKEN=... python3 dev/natif/annoncer_maj.py "Texte facultatif" [roles]
  roles : liste séparée par des virgules (ex. tresorier,president) pour ne prévenir que les profils concernés ;
          vide = tout le monde. Rôles : president, tresorier, secretaire, organisateur, commissaire, membre.
(attend que GitHub Pages serve bien la version de dev/VERSION, puis appelle annoncer_mise_a_jour)."""
import json,os,sys,time,urllib.request,pathlib
REF='zrnhsdtpfyjlvrgrmssf'
ver=(pathlib.Path(__file__).resolve().parent.parent/'VERSION').read_text().strip()
texte=sys.argv[1] if len(sys.argv)>1 else ''
roles=[r.strip() for r in (sys.argv[2] if len(sys.argv)>2 else '').split(',') if r.strip()]
for i in range(30):
    try:
        v=json.load(urllib.request.urlopen(f'https://kngpa.github.io/Younity-/natif/version.json?t={time.time()}',timeout=20))['version']
        if v==ver:break
    except Exception:pass
    time.sleep(10)
else: sys.exit(f'La version {ver} n\'est pas encore en ligne.')
q="select annoncer_mise_a_jour('%s','%s',%s) as n"%(ver.replace("'","''"),texte.replace("'","''"),("array[%s]::text[]"%",".join("'%s'"%r for r in roles)) if roles else "null")
rq=urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query',data=json.dumps({'query':q}).encode(),
    headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'},method='POST')
print('Notification envoyée',('aux rôles '+', '.join(roles)) if roles else 'à tout le monde',':',json.load(urllib.request.urlopen(rq,timeout=60))[0]['n'],'comptes pour la version',ver)
