"""Download the official HECAA export and stage validated prices (stdlib only).
No price years or billing periods are inferred. Use --apply to update the index.
"""
import argparse
import datetime
import hashlib
import http.cookiejar
import importlib.util
import json
import tempfile
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

SOURCE = 'https://hecaa.mineducacion.gov.co/consultaspublicas/programas'
ROOT = Path(__file__).resolve().parents[1]


class Forms(HTMLParser):
    def __init__(self):
        super().__init__()
        self.forms, self.current, self.button = [], None, None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'form':
            self.current = dict(action=attrs.get('action', ''), fields={}, buttons=[])
        if self.current is not None and tag == 'input' and attrs.get('name'):
            self.current['fields'][attrs['name']] = attrs.get('value', '')
        if self.current is not None and tag == 'button':
            self.button = dict(name=attrs.get('name'), text='')

    def handle_data(self, data):
        if self.button is not None:
            self.button['text'] += data

    def handle_endtag(self, tag):
        if tag == 'button' and self.button is not None:
            self.current['buttons'].append(self.button)
            self.button = None
        if tag == 'form' and self.current is not None:
            self.forms.append(self.current)
            self.current = None


def download():
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    opener.addheaders = [('User-Agent', 'EduPlan-tuition/1.0 (official public catalog refresh)')]
    with opener.open(SOURCE, timeout=60) as response:
        html = response.read(4_000_000).decode('utf-8')
    parser = Forms()
    parser.feed(html)
    matches = [(f, b) for f in parser.forms for b in f['buttons'] if b['text'].strip() == 'Descargar programas']
    if len(matches) != 1:
        raise ValueError('El formulario oficial cambió; se conserva el índice anterior')
    form, button = matches[0]
    target = urllib.parse.urljoin(SOURCE, form['action'])
    if urllib.parse.urlsplit(target).hostname != urllib.parse.urlsplit(SOURCE).hostname:
        raise ValueError('Destino de descarga inesperado')
    fields = {**form['fields'], button['name']: ''}
    request = urllib.request.Request(target, data=urllib.parse.urlencode(fields).encode())
    with opener.open(request, timeout=180) as response:
        data = response.read(40_000_001)
    if len(data) > 40_000_000 or not data.startswith(b'PK'):
        raise ValueError('No se recibió un XLSX completo; se conserva el índice anterior')
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--output-dir', type=Path, default=ROOT.parent / '.tools/tuition')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('tuition_import', ROOT / 'tools/import-snies-tuition.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    data = download()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / 'programas.xlsx').write_bytes(data)
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'programas.xlsx'
        path.write_bytes(data)
        count, records = module.extract(path)
        name_spec = importlib.util.spec_from_file_location('names_import', ROOT / 'tools/import-snies-names.py')
        name_module = importlib.util.module_from_spec(name_spec)
        name_spec.loader.exec_module(name_module)
        name_count, name_records = name_module.extract(path)
        _, active_records = name_module.extract(path, active_only=True)
        _, active_details = name_module.extract(path, active_only=True, include_details=True)
    previous = json.loads((ROOT / 'data/snies-tuition.json').read_text())
    if count < previous.get('sourceRows', count) * 0.9 or len(records) < len(previous['records']) * 0.9:
        raise ValueError('Caída superior al 10% en el catálogo; requiere revisión y no reemplaza datos')
    payload = dict(schemaVersion=1, source=SOURCE, field='COSTO_MATRÍCULA_ESTUD_NUEVOS',
                   importedAt=datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
                   sha256=hashlib.sha256(data).hexdigest(), sourceRows=count, records=records)
    candidate = args.output_dir / 'snies-tuition.json'
    candidate.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
    previous_names = json.loads((ROOT / 'data/snies-program-names.json').read_text())
    if len(name_records) < len(previous_names['records']) * 0.9:
        raise ValueError('Caída superior al 10% en identidades oficiales; requiere revisión')
    name_payload = dict(schemaVersion=2, source=SOURCE, field='NOMBRE_DEL_PROGRAMA',
                        importedAt=payload['importedAt'], sha256=payload['sha256'], sourceRows=name_count, records=name_records, activeRecords=active_records, activeDetails=active_details)
    name_candidate = args.output_dir / 'snies-program-names.json'
    name_candidate.write_text(json.dumps(name_payload, ensure_ascii=False, separators=(',', ':')) + '\n')
    if args.apply:
        target = ROOT / 'data/snies-tuition.json'
        temporary = target.with_suffix('.json.tmp')
        temporary.write_text(candidate.read_text())
        temporary.replace(target)
        name_target = ROOT / 'data/snies-program-names.json'
        name_temporary = name_target.with_suffix('.json.tmp')
        name_temporary.write_text(name_candidate.read_text())
        name_temporary.replace(name_target)
    print(json.dumps(dict(sourceRows=count, prices=len(records), applied=args.apply, candidate=str(candidate))))


if __name__ == '__main__':
    main()
