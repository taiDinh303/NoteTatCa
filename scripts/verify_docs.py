"""Validate the single root docs directory and portable Markdown links."""
from pathlib import Path
import json
import re
import sys
root = Path(__file__).resolve().parents[1]
docs = root / 'docs'
errors = []
links = 0
files = sorted(docs.glob('*.md'))
if not files or not (docs / '00-README.md').is_file():
    errors.append('root docs/00-README.md is required')
if (root / 'ntc_aspnet' / 'docs').exists():
    errors.append('duplicate ntc_aspnet/docs must not exist; use root docs only')
for path in files:
    text = path.read_text(encoding='utf-8-sig')
    prose = re.sub(r'```[^\n]*\n.*?```', '', text, flags=re.S)
    if len(re.findall(r'^# ', prose, re.M)) != 1:
        errors.append(f'{path.name}: expected exactly one H1 heading')
    if '\ufffd' in text or re.search(r'\{\{[A-Z_]+\}\}', text):
        errors.append(f'{path.name}: encoding replacement or unresolved template field')
    for sample in re.findall(r'```json\s*\n(.*?)\n```', text, re.S):
        try:
            payload = json.loads(sample)
            if isinstance(payload, dict) and payload.get('documentJson'):
                json.loads(payload['documentJson'])
        except (ValueError, TypeError):
            errors.append(f'{path.name}: invalid JSON example')
    for target in re.findall(r'\]\(([^)]+)\)', text):
        if re.match(r'(?:https?://|#)', target):
            continue
        target = target.split('#', 1)[0].strip('<>')
        links += 1
        if not (path.parent / target).exists():
            errors.append(f'{path.name}: missing link {target}')
for error in errors:
    print(error)
print(f'{len(files)} Markdown files; {links} local links; {len(errors)} errors')
sys.exit(bool(errors))
