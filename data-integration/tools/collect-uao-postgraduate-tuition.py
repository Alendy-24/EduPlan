"""UAO resolution 758: full postgraduate tuition, excluding credit tariffs."""
import argparse
import datetime
import hashlib
import importlib.util
import io
import json
import re
import subprocess
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://www.uao.edu.co/wp-content/uploads/2025/12/Res-CS-758-Valor-Matricula-prosgrado-2026.pdf'
spec = importlib.util.spec_from_file_location('uao_tables', ROOT / 'tools/collect-tuition-tables.py')
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)


def extract_uao_postgraduate(pages, names, source, checked_at, digest):
    if source != SOURCE:
        raise ValueError('Fuente UAO posgrados no autorizada')
    year = int(checked_at[:4])
    text = '\n\f\n'.join(pages)
    if f'ELANO{year}' not in common.fold(text[:4000]):
        raise ValueError('No se confirma la vigencia de la resolución')
    records, pending = [], []
    for article, prefix, minimum in [(2, 'Especialización', 30), (3, 'Maestría', 5)]:
        start = re.search(r'ART[IÍ]CULO\s+' + str(article) + r'[°º]?:', text)
        if not start:
            raise ValueError('Artículo de matrícula completa ausente')
        tail = text[start.end():]
        end = re.search(r'PAR[AÁ]GRAFO\s+1:', tail)
        if not end:
            raise ValueError('Límite de tabla no reconocido')
        section = tail[:end.start()]
        folded = common.fold(section)
        if f'DURANTEELANO{year}' not in folded or 'MATRICULACOMPLETAENPESOSCOLOMBIANOS' not in folded or 'VALORSEMESTRE1ERY2DOPERIODOACADEMICO' not in folded:
            raise ValueError('No se confirman año, importe completo y período')
        rows = list(re.finditer(r'^(' + prefix + r'\s+[^$]+?)\$[ \t]*([0-9. \t]+)[ \t]*$', section, re.M))
        if len(rows) < minimum or section.count('$') != len(rows) + section.count('($COP)'):
            raise ValueError('Tabla de matrículas incompleta o importes no reconocidos')
        for match in rows:
            label, raw_amount = common.fold(match[1]), re.sub(r'\s+', '', match[2])
            if not re.fullmatch(r'\d{1,3}(?:\.\d{3})+', raw_amount):
                pending.append(dict(program=match[1].strip(), reason='INVALID_AMOUNT'))
                continue
            mode = next((m for m in ['PRESENCIAL', 'COMBINADA', 'VIRTUAL'] if label.endswith(m)), None)
            if not mode:
                pending.append(dict(program=match[1].strip(), reason='MISSING_EXPLICIT_MODALITY'))
                continue
            name = label[:-len(mode)]
            if mode == 'COMBINADA' and name.endswith('PRESENCIALVIRTUAL'):
                name = name[:-len('PRESENCIALVIRTUAL')]
            allowed = {'PRESENCIAL': {'PRESENCIAL'}, 'VIRTUAL': {'VIRTUAL'}, 'COMBINADA': {'PRESENCIALVIRTUAL', 'HIBRIDAPRESENCIALVIRTUAL'}}[mode]
            matches = [n for n in names if n[1] == '1830' and common.fold(n[2]) == name and common.fold(n[4]) == 'POSGRADO' and common.fold(n[5]) in allowed]
            unique = {tuple([n[0], n[1], common.fold(n[5]), common.fold(n[6])]): n for n in matches}
            if len(unique) != 1:
                pending.append(dict(program=match[1].strip(), reason='AMBIGUOUS_OR_MISSING_ACTIVE_IDENTITY'))
                continue
            n = next(iter(unique.values()))
            records.append(dict(sniesCode=n[0], institutionCode=n[1], programName=n[2], modality=n[5], municipality=n[6], amount=int(raw_amount.replace('.', '')),
                                source=source, sourcePage=text[:start.end()+match.start()].count('\f')+1, checkedAt=checked_at, priceYear=year, billingPeriod='SEMESTER',
                                note=f'Resolución 758: matrícula completa de posgrado por semestre, primer y segundo período académico {year}. No incluye estampilla Procultura, cursos nivelatorios ni créditos fuera de los ciclos establecidos.',
                                contentSha256=digest, collector='UAO_POSTGRADUATE_COMPLETE_V1'))
    return records, pending


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    content = common.get(SOURCE)
    if not content.startswith(b'%PDF'):
        raise ValueError('La fuente no devolvió PDF')
    checked_at = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    names = json.loads((ROOT / 'data/snies-program-names.json').read_text())['activeRecords']
    records, pending = extract_uao_postgraduate([p.extract_text() for p in PdfReader(io.BytesIO(content)).pages], names, SOURCE, checked_at, hashlib.sha256(content).hexdigest())
    output = ROOT.parent / '.tools/tuition'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'uao-postgraduate-source.pdf').write_bytes(content)
    candidate = output / 'uao-postgraduate-candidates.json'
    candidate.write_text(json.dumps(dict(schemaVersion=1, records=records), ensure_ascii=False, indent=2) + '\n')
    (output / 'uao-postgraduate-report.json').write_text(json.dumps(dict(source=SOURCE, checkedAt=checked_at, verified=len(records), pending=pending), ensure_ascii=False, indent=2) + '\n')
    if not records:
        raise ValueError('No hay tarifas verificadas para incorporar')
    if args.apply:
        subprocess.run(['node', str(ROOT / 'tools/apply-table-tuition.mjs'), str(candidate)], check=True)
    print(json.dumps(dict(verified=len(records), pending=len(pending), applied=args.apply)))


if __name__ == '__main__':
    main()
