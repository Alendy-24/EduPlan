"""UPB consolidated schedule: explicit first-semester totals, never averages."""
import argparse
import datetime
import hashlib
import io
import json
import re
import subprocess
import unicodedata
import urllib.request
import urllib.parse
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://www.upb.edu.co/es/documentos/doc-consolidadodetarifas2026upb-1464294812511.pdf'
CODES = {'1710', '1723', '1727', '1730'}


def fold(s):
    return re.sub('[^A-Z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().upper())


def city(s):
    return {'SANTIAGODECALI': 'CALI', 'CARTAGENADEINDIAS': 'CARTAGENA', 'BOGOTADC': 'BOGOTA', 'SANJOSEDECUCUTA': 'CUCUTA'}.get(fold(s), fold(s))


def extract_upb(pages, names, source, checked_at, digest):
    if source != SOURCE:
        raise ValueError('Fuente consolidada UPB no autorizada')
    year = int(checked_at[:4])
    text = re.sub(r'\s+', ' ', '\n'.join(pages))
    if not re.match(r'\s*PREGRADO PRESENCIAL ' + str(year), text):
        raise ValueError('La tabla UPB no confirma la vigencia actual')
    header = re.compile(r'Valor Crédito (\d{4}) Valor Primer Semestre (\d{4}) Valor Matrícula Promedio (\d{4})')
    headers = header.findall(text)
    if not headers or any(any(int(y) != year for y in h) for h in headers):
        raise ValueError('No se confirman columnas de total, crédito y promedio')
    markers = list(re.finditer(r'(?<!\d)(\d{3,7})\s+RRG\s+No\s+\d{3}/\d{4}\b', text))
    records, pending = [], []
    for i, marker in enumerate(markers):
        segment = text[marker.end():markers[i + 1].start() if i + 1 < len(markers) else len(text)]
        code = marker[1]
        # Require all three monetary cells intact, in the documented order.
        amounts = re.findall(r'\$\s*(\d{1,3}(?:\.\d{3})+)(?![\d.,])', segment)
        context = re.search(r'\b(Presencial|Virtual|A distancia)\s+(.*?)\s*(\d+)\s+(\d+)\s+(\d+)\s+[\d,.]+%\s*\$', segment)
        if len(amounts) != 3 or segment.count('$') != 3 or not context or re.search(r'no se ofertar|\banual\b|\baño\b', segment, re.I):
            pending.append(dict(sniesCode=code, reason='NO_EXPLICIT_UNAMBIGUOUS_FIRST_SEMESTER_TOTAL'))
            continue
        mode, location, _, _, credits = context.groups()
        if int(credits) <= 0:
            continue
        matches = [n for n in names if n[0] == code and n[1] in CODES and fold(n[5]) == fold(mode)
                   and (not location.strip() or fold(location).endswith(city(n[6])))]
        unique = {tuple([n[0], n[1], fold(n[5]), city(n[6])]): n for n in matches}
        if len(unique) != 1:
            pending.append(dict(sniesCode=code, reason='AMBIGUOUS_OR_MISSING_ACTIVE_IDENTITY'))
            continue
        n = next(iter(unique.values()))
        records.append(dict(sniesCode=n[0], institutionCode=n[1], programName=n[2], modality=n[5], municipality=n[6],
                            amount=int(amounts[1].replace('.', '')), source=source, checkedAt=checked_at, priceYear=year,
                            billingPeriod='FIRST_ENROLLMENT', note=f'Valor completo del primer semestre {year} publicado por UPB para {credits} créditos. No corresponde a la columna de matrícula promedio ni al precio por crédito. La liquidación puede variar si se modifica la carga inscrita; otros derechos se pagan por separado.',
                            evidence=f'SNIES {code}; modalidad {mode}; lugar {location.strip() or "virtual sin lugar diferenciado"}; valor primer semestre {year}: {amounts[1]} COP.',
                            contentSha256=digest, collector='UPB_FIRST_SEMESTER_TABLE_V1'))
    return records, pending


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    # UPB migrated this document to its official portal; allow its exact URL only.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            target = urllib.parse.urlsplit(newurl)
            expected = urllib.parse.urlsplit(SOURCE)
            migrated = 'https://portal.upb.edu.co/wp-content/uploads/2026/04/consolidado-tarifas.pdf'
            same_file = target.scheme == 'https' and target.netloc == expected.netloc and target.path in {expected.path, '/ss' + expected.path} and not target.query
            if not same_file and newurl != migrated:
                raise ValueError('Redirección no autorizada')
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    opener = urllib.request.build_opener(NoRedirect())
    with opener.open(urllib.request.Request(SOURCE, headers={'User-Agent': 'EduPlan-tuition/1.0'}), timeout=45) as response:
        content = response.read(12_000_001)
    if len(content) > 12_000_000 or not content.startswith(b'%PDF'):
        raise ValueError('PDF ausente o demasiado grande')
    names = json.loads((ROOT / 'data/snies-program-names.json').read_text())['activeRecords']
    checked_at = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    records, pending = extract_upb([p.extract_text() for p in PdfReader(io.BytesIO(content)).pages], names, SOURCE, checked_at, hashlib.sha256(content).hexdigest())
    if len(records) < 30:
        raise ValueError('Tabla UPB incompleta; requiere revisión')
    directory = ROOT.parent / '.tools/tuition'
    directory.mkdir(parents=True, exist_ok=True)
    (directory / 'upb-source.pdf').write_bytes(content)
    candidate = directory / 'upb-candidates.json'
    candidate.write_text(json.dumps(dict(schemaVersion=1, records=records), ensure_ascii=False, indent=2) + '\n')
    (directory / 'upb-collection-report.json').write_text(json.dumps(dict(source=SOURCE, checkedAt=checked_at, verified=len(records), pending=pending), ensure_ascii=False, indent=2) + '\n')
    if args.apply:
        subprocess.run(['node', str(ROOT / 'tools/apply-table-tuition.mjs'), str(candidate)], check=True)
    print(json.dumps(dict(verified=len(records), pending=len(pending), applied=args.apply)))


if __name__ == '__main__':
    main()
