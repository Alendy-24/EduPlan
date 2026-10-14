"""UNITECNAR annual ordinary tuition by explicit HECAA formation and modality."""
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
SOURCE = 'https://www.unitecnar.edu.co/web/content/23715/Acuerdo%20N.%2007-25%20Derechos%20Pecuniarios%202026.pdf?unique=6a3dcbf856056347b42c473dbf049708ec93b25c'


def fold(s):
    return re.sub('[^A-Z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().upper())


def extract_unitecnar(pages, names, details, source, checked_at, digest):
    if source != SOURCE:
        raise ValueError('Fuente UNITECNAR no autorizada')
    year = int(checked_at[:4])
    text = re.sub(r'\s+', ' ', '\n'.join(pages))
    compact = fold(text)
    if f'FIJARPARAELANOLECTIVODEL{year}' not in compact or 'MODALIDADEXCEPCIONALORDINARIAEXTRAORDINARIA' not in compact:
        raise ValueError('No se confirma vigencia anual ni orden de las columnas')
    if 'MATRICULAHASTA8CREDITOS50DELVALORDELAMATRICULAESTABLECIDO' not in compact:
        raise ValueError('No se confirma la condición de carga académica')
    categories = [('Técnica Profesional Presencial', 'Formación técnica profesional', 'Presencial'), ('Técnica Profesional a Distancia', 'Formación técnica profesional', 'A distancia'), ('Tecnología Presencial', 'Tecnológico', 'Presencial'), ('Tecnología Distancia', 'Tecnológico', 'A distancia'), ('Tecnología Virtual', 'Tecnológico', 'Virtual'), ('Universitaria Presencial', 'Universitario', 'Presencial'), ('Universitaria Virtual', 'Universitario', 'Virtual')]
    fees = {}
    for label, formation, mode in categories:
        matches = list(re.finditer(re.escape(label) + r'\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)(?=\s|$)', text, re.I))
        if len(matches) != 1 or not re.fullmatch(r'\d{1,3}(?:\.\d{3})+', matches[0][2]):
            raise ValueError('Tarifa ordinaria ausente o ambigua: ' + label)
        fees[(fold(formation), fold(mode))] = int(matches[0][2].replace('.', ''))
    special = re.search(r'Tecnología en Gestión Gastronómica el valor de la matrícula será de:\s+(\d{1,3}(?:\.\d{3})+)\s+(\d{1,3}(?:\.\d{3})+)\s+Incluye el costo del uniforme', text, re.I)
    if not special:
        raise ValueError('No se pudo distinguir la excepción de Gestión Gastronómica')
    formations = {}
    for d in details:
        if d[1] == '3710':
            formations.setdefault((d[0], d[1], fold(d[2]), fold(d[3])), set()).add(fold(d[4]))
    records, pending = [], []
    for n in names:
        # Limit this table to Cartagena; do not extend a tariff to another campus.
        if n[1] != '3710' or n[4] != 'Pregrado' or fold(n[6]) not in {'CARTAGENA', 'CARTAGENADEINDIAS'}:
            continue
        formation = formations.get((n[0], n[1], fold(n[5]), fold(n[6])), set())
        if len(formation) != 1:
            pending.append(dict(sniesCode=n[0], reason='MISSING_OR_CONFLICTING_OFFICIAL_FORMATION'))
            continue
        category = (next(iter(formation)), fold(n[5]))
        amount = fees.get(category)
        if amount is None:
            pending.append(dict(sniesCode=n[0], reason='NO_EXPLICIT_CATEGORY_RATE'))
            continue
        if 'GASTRONOM' in fold(n[2]):
            if fold(n[2]) == 'TECNOLOGIAENGESTIONGASTRONOMICA' and fold(n[5]) == 'PRESENCIAL':
                amount = int(special[1].replace('.', ''))
            else:
                pending.append(dict(sniesCode=n[0], reason='UNREVIEWED_GASTRONOMY_EXCEPTION'))
                continue
        records.append(dict(sniesCode=n[0], institutionCode=n[1], programName=n[2], modality=n[5], municipality=n[6], amount=amount, source=source, checkedAt=checked_at, priceYear=year, billingPeriod='ACADEMIC_PERIOD',
                            note=f'Acuerdo 07-25: matrícula ordinaria para el año lectivo {year}, Cartagena, según nivel de formación y modalidad oficiales. Valor completo para carga superior a ocho créditos; hasta ocho créditos aplica una liquidación diferente. No incluye seguro, estampilla Procultura ni otros derechos. Confirma el calendario de pago; no es matrícula excepcional ni extraordinaria.' + (' Incluye uniforme según la excepción de Gestión Gastronómica.' if 'GASTRONOM' in fold(n[2]) else ''),
                            contentSha256=digest, collector='UNITECNAR_ORDINARY_CATEGORY_V1'))
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
    names = json.loads((ROOT / 'data/snies-program-names.json').read_text())
    if not names.get('activeDetails'):
        raise ValueError('Faltan niveles de formación oficiales activos')
    checked_at = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    records, pending = extract_unitecnar([p.extract_text() for p in PdfReader(io.BytesIO(content)).pages], names['activeRecords'], names['activeDetails'], SOURCE, checked_at, hashlib.sha256(content).hexdigest())
    if not records:
        raise ValueError('No se identificaron tarifas válidas')
    directory = ROOT.parent / '.tools/tuition'
    directory.mkdir(parents=True, exist_ok=True)
    (directory / 'unitecnar-source.pdf').write_bytes(content)
    candidate = directory / 'unitecnar-candidates.json'
    candidate.write_text(json.dumps(dict(schemaVersion=1, records=records), ensure_ascii=False, indent=2) + '\n')
    (directory / 'unitecnar-report.json').write_text(json.dumps(dict(source=SOURCE, checkedAt=checked_at, verified=len(records), pending=pending), ensure_ascii=False, indent=2) + '\n')
    if args.apply:
        subprocess.run(['node', str(ROOT / 'tools/apply-table-tuition.mjs'), str(candidate)], check=True)
    print(json.dumps(dict(verified=len(records), pending=len(pending), applied=args.apply)))


if __name__ == '__main__':
    main()
