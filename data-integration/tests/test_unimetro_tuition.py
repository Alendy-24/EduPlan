import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('unimetro', Path(__file__).parents[1] / 'tools/collect-unimetro-tuition.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class UnimetroTests(unittest.TestCase):
    names = [['1', '1824', 'MEDICINA', '', 'Pregrado', 'Presencial', 'Barranquilla']]
    text = 'Valor de matrículas\nProgramas de Pregrado\n2026\nMedicina $ 14.226.000\n' + ''.join(f'Otro {i} $ 3.000.000\n' for i in range(10))

    def extract(self, text=None, names=None):
        return m.extract_unimetro([self.text if text is None else text], self.names if names is None else names, m.SOURCE, '2026-10-14', 'a' * 64)[0]

    def test_literal_value_and_unspecified_period(self):
        rows = self.extract()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['amount'], 14226000)
        self.assertEqual(rows[0]['billingPeriod'], 'ACADEMIC_PERIOD')

    def test_wrong_year_decimal_or_missing_table_fails_closed(self):
        for text in [self.text.replace('2026', '2025'), self.text.replace('14.226.000', '14.226.000,50'), self.text.replace('Medicina $ 14.226.000\n', '')]:
            with self.assertRaises(ValueError):
                self.extract(text)

    def test_ambiguous_active_code_or_other_institution_is_not_assigned(self):
        self.assertEqual(self.extract(names=self.names + [['2', '1824', 'MEDICINA', '', 'Pregrado', 'Presencial', 'Barranquilla']]), [])
        self.assertEqual(self.extract(names=[['1', '2708', 'MEDICINA', '', 'Pregrado', 'Presencial', 'Medellín']]), [])


if __name__ == '__main__':
    unittest.main()
