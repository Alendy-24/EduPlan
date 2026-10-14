"""Import reported tuition from the official HECAA XLSX, without assuming a price year.
Usage: python3 tools/import-snies-tuition.py programas.xlsx --date YYYY-MM-DD
"""
import argparse
import datetime
import hashlib
import json
import math
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
SOURCE = 'https://hecaa.mineducacion.gov.co/consultaspublicas/programas'

def extract(path):
    rows = []
    with ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(node.itertext()) for node in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        with archive.open('xl/worksheets/sheet1.xml') as sheet:
            for _, row in ET.iterparse(sheet, events=('end',)):
                if row.tag != '{' + NS['m'] + '}row':
                    continue
                values = {}
                for cell in row:
                    column = ''.join(c for c in cell.attrib['r'] if c.isalpha())
                    value = cell.findtext('m:v', '', NS)
                    if cell.attrib.get('t') == 's':
                        value = shared[int(value)]
                    elif cell.attrib.get('t') == 'inlineStr':
                        value = ''.join(cell.find('m:is', NS).itertext())
                    values[column] = value.strip()
                rows.append(values)
                row.clear()
    headers, *data = rows
    labels = ['CÓDIGO_SNIES_DEL_PROGRAMA', 'CÓDIGO_INSTITUCIÓN', 'MODALIDAD',
              'MUNICIPIO_OFERTA_PROGRAMA', 'COSTO_MATRÍCULA_ESTUD_NUEVOS']
    columns = []
    for label in labels:
        matches = [key for key, value in headers.items() if value == label]
        if len(matches) != 1:
            raise ValueError('Missing/ambiguous column: ' + label)
        columns.append(matches[0])
    records = set()
    for row in data:
        code, institution, modality, city, cost = [row.get(key, '') for key in columns]
        try:
            amount = float(cost)
            code, institution = str(int(float(code))), str(int(float(institution)))
        except ValueError:
            continue
        # Zero is retained if explicitly reported, never substituted for missing data.
        if not math.isfinite(amount) or amount < 0 or not modality or not city:
            continue
        records.add((code, institution, modality, city, amount))
    if len(data) < 1000 or not records:
        raise ValueError('Incomplete export; refusing to replace tuition data')
    return len(data), sorted(records)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('file', type=Path)
    parser.add_argument('--date', required=True)
    args = parser.parse_args()
    datetime.date.fromisoformat(args.date)
    count, records = extract(args.file)
    output = Path(__file__).resolve().parents[1] / 'data/snies-tuition.json'
    payload = dict(schemaVersion=1, source=SOURCE, field='COSTO_MATRÍCULA_ESTUD_NUEVOS',
                   importedAt=args.date, sha256=hashlib.sha256(args.file.read_bytes()).hexdigest(),
                   sourceRows=count, records=records)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{count} source rows; {len(records)} tuition records imported')
