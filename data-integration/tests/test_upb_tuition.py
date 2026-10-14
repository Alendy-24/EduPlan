import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('upb', Path(__file__).parents[1] / 'tools/collect-upb-tuition.py')
upb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upb)


class UpbTuitionTests(unittest.TestCase):
    names = [['1205', '1710', 'ARQUITECTURA', 'ARQUITECTO', 'Pregrado', 'Presencial', 'Medellín']]
    header = 'PREGRADO PRESENCIAL 2026 Valor Crédito 2026 Valor Primer Semestre 2026 Valor Matrícula Promedio 2026 '
    row = '1205 RRG No 085/2025 Arquitectura PREGRADO Presencial ANTIOQUIA MEDELLIN 10 164 17 7,00% $ 852.400 $ 14.490.800 $ 13.980.492 '

    def extract(self, row=None, names=None):
        return upb.extract_upb([self.header + (row if row is not None else self.row)], self.names if names is None else names, upb.SOURCE, '2026-10-14', 'a' * 64)[0]

    def test_explicit_total_not_average_or_credit(self):
        r = self.extract()[0]
        self.assertEqual(r['amount'], 14490800)
        self.assertEqual(r['billingPeriod'], 'FIRST_ENROLLMENT')

    def test_rejects_missing_new_student_total_and_decimals(self):
        for change in ['No se ofertará para estudiantes nuevos', '$ 14.490.800,50', '$ -']:
            self.assertEqual(self.extract(self.row.replace('$ 14.490.800', change)), [])

    def test_rejects_cross_city_and_institution(self):
        for institution, city in [('1710', 'Cali'), ('2812', 'Medellín')]:
            self.assertEqual(self.extract(names=[['1205', institution, 'ARQUITECTURA', '', 'Pregrado', 'Presencial', city]]), [])

    def test_virtual_without_location_requires_unique_identity(self):
        row = self.row.replace('Presencial ANTIOQUIA MEDELLIN', 'Virtual')
        names = [['1205', '1710', 'ARQUITECTURA', '', 'Pregrado', 'Virtual', 'Medellín']]
        self.assertEqual(len(self.extract(row, names)), 1)
        self.assertEqual(self.extract(row, names + [['1205', '1710', 'ARQUITECTURA', '', 'Pregrado', 'Virtual', 'Cali']]), [])

    def test_rejects_wrong_year_or_reordered_columns(self):
        for header in [self.header.replace('2026', '2025'), self.header.replace('Valor Primer Semestre', 'Valor Otro Concepto')]:
            with self.assertRaises(ValueError):
                upb.extract_upb([header + self.row], self.names, upb.SOURCE, '2026-10-14', 'a' * 64)

    def test_extra_fees_or_unknown_load_do_not_shift_cells(self):
        self.assertEqual(self.extract(self.row + '$ 250.000'), [])
        self.assertEqual(self.extract(self.row.replace('10 164 17', '10 164')), [])


if __name__ == '__main__':
    unittest.main()
