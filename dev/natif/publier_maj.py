#!/usr/bin/env python3
"""Publie une mise à jour de l'application Android SANS nouvel APK.
1) Augmente le numéro dans dev/VERSION (ex. 2.0.1)
2) python3 dev/natif/publier_maj.py
3) git add -A && git commit && git push  -> les téléphones téléchargent la mise à jour en arrière-plan
   et l'installent la prochaine fois que l'appli passe en arrière-plan.
Un nouvel APK n'est nécessaire que si on ajoute une fonction native (nouveau plugin, permission…)."""
import pathlib,subprocess,zipfile,json,hashlib,sys
H=pathlib.Path(__file__).resolve().parent;DEV=H.parent;ROOT=DEV.parent
subprocess.run([sys.executable,str(DEV/'build.py')],check=True)
ver=(DEV/'VERSION').read_text().strip()
out=ROOT/'natif';out.mkdir(exist_ok=True)
for z in out.glob('younity-*.zip'):z.unlink()
zp=out/f'younity-{ver}.zip'
with zipfile.ZipFile(zp,'w',zipfile.ZIP_DEFLATED) as z:
    for f in ['index.html','manifest.webmanifest']:z.write(ROOT/f,f)
    for d in ['vendor','icons']:
        for p in sorted((ROOT/d).rglob('*')):
            if p.is_file():z.write(p,str(p.relative_to(ROOT)))
sha=hashlib.sha256(zp.read_bytes()).hexdigest()
(out/'version.json').write_text(json.dumps({'version':ver,'url':f'https://kngpa.github.io/Younity-/natif/{zp.name}'},indent=1))
print('Mise à jour',ver,'prête :',zp.name,round(zp.stat().st_size/1024),'Ko')
