import importlib.util
from pathlib import Path
import tempfile
import unittest
from xml.sax.saxutils import escape
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('names_import', Path(__file__).parents[1] / 'tools/import-snies-names.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class SniesDetailsTests(unittest.TestCase):
    headers = ['CÓDIGO_SNIES_DEL_PROGRAMA', 'CÓDIGO_INSTITUCIÓN', 'NOMBRE_DEL_PROGRAMA', 'TITULO_OTORGADO', 'NIVEL_ACADÉMICO', 'MODALIDAD', 'MUNICIPIO_OFERTA_PROGRAMA', 'ESTADO_PROGRAMA', 'NIVEL_DE_FORMACIÓN', 'NÚMERO_CRÉDITOS', 'NÚMERO_PERIODOS_DE_DURACIÓN', 'PERIODICIDAD']
    values = ['1.0', '1701.0', 'NOMBRE', 'TITULO', 'Pregrado', 'Presencial', 'Bogotá, D.C.', 'Activo', 'Universitario', '160.0', '10.0', 'Semestral']

    def build(self, file, headers=None, values=None):
        def row(values, number):
            return '<row>' + ''.join(f'<c r="{chr(65+i)}{number}" t="inlineStr"><is><t>{escape(value)}</t></is></c>' for i, value in enumerate(values)) + '</row>'
        rows = row(self.headers if headers is None else headers, 1) + ''.join(row([str(i+1)+'.0', *(self.values if values is None else values)[1:]], i + 2) for i in range(1001))
        with ZipFile(file, 'w') as z:
            z.writestr('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + rows + '</sheetData></worksheet>')

    def test_metadata_preserves_literal_units_and_existing_name_contract(self):
        with tempfile.TemporaryDirectory() as d:
            file = Path(d) / 'programas.xlsx'
            self.build(file)
            _, names = m.extract(file, active_only=True)
            _, details = m.extract(file, active_only=True, include_details=True)
            self.assertEqual(len(names[0]), 7)
            self.assertEqual(len(details), 1001)
            self.assertEqual(details[0], ('1', '1701', 'Presencial', 'Bogotá, D.C.', 'Universitario', '160.0', '10.0', 'Semestral'))

    def test_only_active_rows_supply_disambiguating_metadata(self):
        with tempfile.TemporaryDirectory() as d:
            file = Path(d) / 'programas.xlsx'
            self.build(file, values=[*self.values[:7], 'Inactivo', *self.values[8:]])
            # Active-only export must fail its completeness guard for an empty result.
            with self.assertRaises(ValueError):
                m.extract(file, active_only=True, include_details=True)

    def test_changed_or_missing_metadata_column_cannot_replace_index(self):
        with tempfile.TemporaryDirectory() as d:
            file = Path(d) / 'programas.xlsx'
            self.build(file, headers=[*self.headers[:9], 'OTRO_CAMPO', *self.headers[10:]])
            with self.assertRaises(ValueError):
                m.extract(file, active_only=True, include_details=True)


if __name__ == '__main__':
    unittest.main()
