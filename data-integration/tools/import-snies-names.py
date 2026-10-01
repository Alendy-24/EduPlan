"""Import only academic names from the official HECAA 'Descargar programas' XLSX.

Usage: python tools/import-snies-names.py download.xlsx --date YYYY-MM-DD
No network requests, university scraping, title conversion, or Excel dependencies.
"""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
SOURCE = 'https://hecaa.mineducacion.gov.co/consultaspublicas/programas'

def extract(path):
    with ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            shared = [''.join(node.itertext()) for node in root]
        rows = []
        with archive.open('xl/worksheets/sheet1.xml') as sheet:
            for _, row in ET.iterparse(sheet, events=('end',)):
                if row.tag != '{%s}row' % NS['m']:
                    continue
                values = {}
                for cell in row.findall('m:c', NS):
                    column = ''.join(c for c in cell.attrib['r'] if c.isalpha())
                    value = cell.find('m:v', NS)
                    text = value.text if value is not None else ''
                    if cell.attrib.get('t') == 's':
                        text = shared[int(text)]
                    elif cell.attrib.get('t') == 'inlineStr':
                        text = ''.join(cell.find('m:is', NS).itertext())
                    values[column] = text or ''
                rows.append(values)
                row.clear()
    headers, *data = rows
    def column(label):
        # The export sometimes contains replacement characters in accented headers.
        matches = [key for key, value in headers.items() if value == label]
        if len(matches) != 1:
            raise ValueError('Missing/ambiguous official column: ' + label)
        return matches[0]
    code_column = column('CÓDIGO_SNIES_DEL_PROGRAMA') if 'CÓDIGO_SNIES_DEL_PROGRAMA' in headers.values() else column('C�DIGO_SNIES_DEL_PROGRAMA')
    institution_column = column('CÓDIGO_INSTITUCIÓN') if 'CÓDIGO_INSTITUCIÓN' in headers.values() else column('C�DIGO_INSTITUCI�N')
    name_column = column('NOMBRE_DEL_PROGRAMA')
    title_column = column('TITULO_OTORGADO')
    level_column = column('NIVEL_ACADÉMICO') if 'NIVEL_ACADÉMICO' in headers.values() else column('NIVEL_ACAD�MICO')
    modality_column = column('MODALIDAD')
    city_column = column('MUNICIPIO_OFERTA_PROGRAMA')
    records = set()
    for row in data:
        code, institution, name = (row.get(key, '').strip() for key in (code_column, institution_column, name_column))
        if code.endswith('.0'): code = code[:-2]
        if institution.endswith('.0'): institution = institution[:-2]
        if code.isdigit() and institution.isdigit() and name and '�' not in name:
            context = tuple(row.get(key, '').strip() for key in (title_column, level_column, modality_column, city_column))
            records.add((code, institution, name, *context))
    if len(records) < 1000:
        raise ValueError('Incomplete export; refusing to replace the index')
    return len(data), sorted(records)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('file', type=Path)
    parser.add_argument('--date', required=True)
    args = parser.parse_args()
    count, records = extract(args.file)
    output = Path(__file__).resolve().parents[1] / 'data/snies-program-names.json'
    output.parent.mkdir(exist_ok=True)
    payload = dict(schemaVersion=2, source=SOURCE, field='NOMBRE_DEL_PROGRAMA', importedAt=args.date,
                   sha256=hashlib.sha256(args.file.read_bytes()).hexdigest(), sourceRows=count,
                   records=records)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{count} official rows; {len(records)} unique names imported to {output}')
