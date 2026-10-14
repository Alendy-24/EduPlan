"""Literal 2026 tuition amounts from Universidad Metropolitana's official PDF."""
import argparse
import datetime
import hashlib
import io
import json
import re
import subprocess
import unicodedata
import urllib.request
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://cloud.unimetro.edu.co/precios%20matriculas%202026.pdf'


def fold(s):
    return re.sub('[^A-Z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().upper())


def extract_unimetro(pages, names, source, checked_at, digest):
    if source != SOURCE:
        raise ValueError('Fuente Metropolitana no autorizada')
    year = int(checked_at[:4])
    text = '\n'.join(pages)
    if not re.search(r'Valor de matrículas\s+Programas de Pregrado\s+' + str(year) + r'\b', text):
        raise ValueError('La tabla no confirma la vigencia y nivel académico')
    records, pending = [], []
    rows = list(re.finditer(r'^([^\n$]+)\s+\$\s*(\d{1,3}(?:\.\d{3})+)\s*$', text, re.M))
    if len(rows) != 11 or text.count('$') != 11:
        raise ValueError('La estructura de las once matrículas cambió')
    for match in rows:
        name, amount = match[1].strip(), int(match[2].replace('.', ''))
        matches = [n for n in names if n[1] == '1824' and fold(n[4]) == 'PREGRADO' and fold(n[2]) == fold(name)]
        unique = {tuple([n[0], n[1], fold(n[5]), fold(n[6])]): n for n in matches}
        if len(unique) != 1:
            pending.append(dict(program=name, reason='AMBIGUOUS_OR_MISSING_ACTIVE_IDENTITY'))
            continue
        n = next(iter(unique.values()))
        records.append(dict(sniesCode=n[0], institutionCode=n[1], programName=n[2], modality=n[5], municipality=n[6], amount=amount,
                            source=source, checkedAt=checked_at, priceYear=year, billingPeriod='ACADEMIC_PERIOD',
                            note=f'Valor de matrícula de pregrado {year} publicado por Universidad Metropolitana. El tarifario no especifica la duración del período cobrado; confirma esa duración y los demás derechos con la institución.',
                            contentSha256=digest, collector='UNIMETRO_FIXED_TUITION_V1'))
    return records, pending


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            raise ValueError('Redirección no autorizada')
    with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(SOURCE, headers={'User-Agent': 'EduPlan-tuition/1.0'}), timeout=45) as response:
        content = response.read(12_000_001)
    if len(content) > 12_000_000 or not content.startswith(b'%PDF'):
        raise ValueError('PDF ausente o demasiado grande')
    names = json.loads((ROOT / 'data/snies-program-names.json').read_text())['activeRecords']
    checked_at = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    records, pending = extract_unimetro([p.extract_text() for p in PdfReader(io.BytesIO(content)).pages], names, SOURCE, checked_at, hashlib.sha256(content).hexdigest())
    if not records:
        raise ValueError('Ninguna oferta identificada sin ambigüedad')
    directory = ROOT.parent / '.tools/tuition'
    directory.mkdir(parents=True, exist_ok=True)
    (directory / 'unimetro-source.pdf').write_bytes(content)
    candidate = directory / 'unimetro-candidates.json'
    candidate.write_text(json.dumps(dict(schemaVersion=1, records=records), ensure_ascii=False, indent=2) + '\n')
    (directory / 'unimetro-collection-report.json').write_text(json.dumps(dict(source=SOURCE, checkedAt=checked_at, verified=len(records), pending=pending), ensure_ascii=False, indent=2) + '\n')
    if args.apply:
        subprocess.run(['node', str(ROOT / 'tools/apply-table-tuition.mjs'), str(candidate)], check=True)
    print(json.dumps(dict(verified=len(records), pending=len(pending), applied=args.apply)))


if __name__ == '__main__':
    main()
