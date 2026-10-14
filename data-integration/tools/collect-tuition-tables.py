"""Strict adapters for official tuition tables; no OCR or inferred prices."""
import argparse
import datetime
import hashlib
import io
import json
import re
import unicodedata
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
GUIDE = 'https://www.uao.edu.co/guias-de-matricula/'


def fold(value):
    return re.sub('[^A-Z0-9]', '', unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().upper())


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.urls.append(dict(attrs).get('href', ''))


class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).netloc != 'www.uao.edu.co' or not newurl.startswith('https://'):
            raise ValueError('Redirección fuera del dominio oficial')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def get(url):
    if urllib.parse.urlsplit(url).netloc != 'www.uao.edu.co' or not url.startswith('https://'):
        raise ValueError('Fuente no autorizada')
    opener = urllib.request.build_opener(SameOriginRedirect())
    request = urllib.request.Request(url, headers={'User-Agent': 'EduPlan-tuition/1.0'})
    with opener.open(request, timeout=45) as response:
        content = response.read(12_000_001)
    if len(content) > 12_000_000:
        raise ValueError('Documento excede el límite de tamaño')
    return content


def extract_uao(pages, active_names, source, checked_at, digest):
    year = int(checked_at[:4])
    if urllib.parse.urlsplit(source).netloc != 'www.uao.edu.co' or not source.startswith('https://'):
        raise ValueError('Fuente PDF no autorizada')
    text = '\n\f\n'.join(pages)
    if not re.search(r'AÑO\s+' + str(year), text[:3000]):
        raise ValueError('La resolución no confirma el año actual')
    markers = list(re.finditer(r'ART[IÍ]CULO\s+(\d+)[º°]?', text))
    sections = {int(m[1]): (m.end(), text[m.end():markers[i + 1].start() if i + 1 < len(markers) else len(text)]) for i, m in enumerate(markers)}
    if not all(n in sections for n in [2, 3, 4, 5]):
        raise ValueError('La estructura de artículos de la resolución cambió')
    if not re.search(r'programa nocturno en modalidad presencial', re.sub(r'\s+', ' ', sections[4][1]), re.I):
        raise ValueError('No se confirma la jornada de la tabla nocturna')
    night = {fold(line.split('$')[0]) for line in sections[4][1].splitlines() if '$' in line and line.split('$')[0].strip()}
    if len(night) < 8:
        raise ValueError('No se pudo distinguir la tabla nocturna')
    records, pending = [], []
    for article, modality in [(2, 'Presencial'), (3, 'Presencial-Virtual')]:
        offset, section = sections[article]
        header = re.sub(r'\s+', ' ', section.split('PROGRAMA')[0])
        if not re.search(r'estudiantes nuevos.{0,70}' + str(year), header, re.I) or not re.search(r'entre 10 y 18', header):
            raise ValueError('No se confirma nuevo ingreso y carga académica de la tabla')
        if article == 2 and not re.search(r'programa diurno en modalidad presencial', header, re.I) or article == 3 and not re.search(r'presencial\s*[–-]\s*virtual', header, re.I):
            raise ValueError('La modalidad declarada en el artículo no coincide')
        rows = 0
        for match in re.finditer(r'^([^\n$]+)\s+\$([^\n]+)$', section, re.M):
            name, remainder = match[1].strip(), '$' + match[2]
            amounts = re.findall(r'\$[ \t]*(\d{1,3}(?:\.[ \t]*\d{3})+)(?![\d.,])', remainder)
            if len(amounts) != 2:
                continue
            values = [int(re.sub(r'\D', '', amount)) for amount in amounts]
            rows += 1
            if values[0] != values[1]:
                pending.append(dict(program=name, reason='DIFFERENT_PERIOD_PRICES'))
                continue
            mode = modality
            if '(MODALIDAD DUAL)' in name:
                name, mode = name.replace('(MODALIDAD DUAL)', '').strip(), 'Dual'
            if (mode != 'Dual' and fold(name) in night) or fold(name) == 'CONTADURIAPUBLICA':
                pending.append(dict(program=name, reason='VARIABLE_BY_SHIFT_OR_LOAD'))
                continue
            offers = [n for n in active_names if n[1] == '1830' and fold(n[2]) == fold(name) and n[5] == mode and fold(n[6]) == 'SANTIAGODECALI']
            if len(offers) != 1:
                pending.append(dict(program=name, modality=mode, reason='AMBIGUOUS_ACTIVE_OFFER'))
                continue
            n = offers[0]
            records.append(dict(sniesCode=n[0], institutionCode=n[1], programName=n[2], modality=n[5], municipality=n[6], amount=values[0],
                                source=source, checkedAt=checked_at, priceYear=year, billingPeriod='ACADEMIC_PERIOD',
                                sourcePage=text[:offset + match.start()].count('\f') + 1,
                                note='Matrícula completa para estudiantes nuevos, jornada diurna, con 10 a 18 créditos inscritos. No incluye la Estampilla ProCultura. Confirma la carga y los derechos adicionales con UAO.',
                                evidence=f'Artículo {article}: {name}; primer y segundo periodo {year}: {values[0]} COP.',
                                contentSha256=digest, collector='UAO_NEW_STUDENT_TABLE_V1'))
        if rows < (20 if article == 2 else 5):
            raise ValueError('Tabla de matrículas incompleta: no se incorpora ningún monto')
    return records, pending


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    checked_at = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    links = Links()
    links.feed(get(GUIDE).decode('utf-8'))
    urls = set(u for u in links.urls if f'valormatriculapregrado{checked_at[:4]}pdf' in fold(u).lower())
    if len(urls) != 1:
        raise ValueError('No se encontró una única resolución oficial del año actual')
    source = next(iter(urls))
    content = get(source)
    if not content.startswith(b'%PDF'):
        raise ValueError('La fuente no devolvió un PDF')
    names = json.loads((ROOT / 'data/snies-program-names.json').read_text())
    if not names.get('activeRecords'):
        raise ValueError('Faltan identidades activas verificadas en SNIES')
    records, pending = extract_uao([p.extract_text() for p in PdfReader(io.BytesIO(content)).pages], names['activeRecords'], source, checked_at, hashlib.sha256(content).hexdigest())
    output = ROOT.parent / '.tools/tuition'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'uao-source.pdf').write_bytes(content)
    candidate = output / 'table-candidates.json'
    candidate.write_text(json.dumps(dict(schemaVersion=1, records=records), ensure_ascii=False, indent=2) + '\n')
    (output / 'table-collection-report.json').write_text(json.dumps(dict(checkedAt=checked_at, source=source, verified=len(records), pending=pending), ensure_ascii=False, indent=2) + '\n')
    if args.apply:
        # Reuse the same conflict quarantine and validation as HTML collectors.
        import subprocess
        subprocess.run(['node', str(ROOT / 'tools/apply-table-tuition.mjs'), str(candidate)], check=True)
    print(json.dumps(dict(verified=len(records), pending=len(pending), applied=args.apply)))


if __name__ == '__main__':
    main()
