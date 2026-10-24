#!/usr/bin/env python3
from pathlib import Path
import shutil
here=Path(__file__).resolve().parent
repo=Path.cwd()
if not (repo/'package.json').exists() or not (repo/'src/components/SEO.tsx').exists():
    raise SystemExit('Run from the Simpyll repository root (with package.json and src/components/SEO.tsx).')
for p in (here/'public').iterdir():
    shutil.copy2(p,repo/'public'/p.name)
index=repo/'index.html'; s=index.read_text()
old='<link rel="icon" type="image/svg+xml" href="/favicon.svg" />'
new="""<link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#1e4e3c" />"""
if old not in s: raise SystemExit('Unexpected index.html favicon markup: inspect before applying.')
index.write_text(s.replace(old,new))
seo=repo/'src/components/SEO.tsx'; s=seo.read_text()
old='const imageUrl = image ? getSiteUrl(image) : undefined'
new="const imageUrl = getSiteUrl(image || '/og-image.png')"
if old not in s: raise SystemExit('Unexpected SEO image default: inspect before applying.')
s=s.replace(old,new).replace("content={imageUrl ? 'summary_large_image' : 'summary'}",'content="summary_large_image"')
seo.write_text(s)
print('Brand assets copied and favicon/social metadata updated. Run npm run build, npm run lint, and tests before merging.')
