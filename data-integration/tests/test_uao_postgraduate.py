import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('uao_pos', Path(__file__).parents[1] / 'tools/collect-uao-postgraduate-tuition.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class UaoPostgraduateTests(unittest.TestCase):
    names = [['1', '1830', 'ESPECIALIZACION EN FINANZAS', '', 'Posgrado', 'Presencial', 'Santiago de Cali']]

    def fixture(self, row='Especialización en Finanzas Presencial $ 9 .779.900'):
        def table(article, prefix, count, first):
            return f'ARTÍCULO {article}º: Se establecen valores de matrícula completa en pesos colombianos ($COP) para cada programa durante el año 2026\nPROGRAMA MODALIDAD Valor Semestre 1er y 2do Período Académico\n' + first + '\n' + ''.join(f'{prefix} en Otro {i} Presencial $ 8.421.000\n' for i in range(count-1)) + 'PARÁGRAFO 1: Otros cobros\n'
        return 'EL AÑO 2026\n' + table(2, 'Especialización', 30, row) + table(3, 'Maestría', 5, 'Maestría en Otra Presencial $ 13.364.000') + 'ARTÍCULO 4º: Valor Crédito Académico\nEspecialización en Finanzas Presencial $ 814.100\n'

    def extract(self, text=None, names=None):
        return m.extract_uao_postgraduate([self.fixture() if text is None else text], self.names if names is None else names, m.SOURCE, '2026-10-14', 'a' * 64)[0]

    def test_only_complete_semester_tuition_is_used(self):
        r = self.extract()
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0]['amount'], 9779900)
        self.assertEqual(r[0]['billingPeriod'], 'SEMESTER')

    def test_wrong_year_credit_heading_or_incomplete_table_fails_closed(self):
        for text in [self.fixture().replace('2026', '2025'), self.fixture().replace('Valor Semestre 1er y 2do Período Académico', 'Valor Crédito Académico'), self.fixture().replace('Especialización en Otro 1 Presencial $ 8.421.000\n', ''), self.fixture().replace('9 .779.900', '9.779.900,50')]:
            with self.assertRaises(ValueError):
                self.extract(text)

    def test_combined_modality_does_not_become_presential(self):
        row = 'Especialización en Finanzas (Presencial – Virtual) Combinada $ 9.779.900'
        self.assertEqual(self.extract(self.fixture(row)), [])
        hybrid = [['1', '1830', 'ESPECIALIZACION EN FINANZAS', '', 'Posgrado', 'Híbrida (Presencial-Virtual)', 'Santiago de Cali']]
        self.assertEqual(len(self.extract(self.fixture(row), hybrid)), 1)

    def test_other_campus_or_duplicate_code_is_not_selected(self):
        self.assertEqual(self.extract(names=[*self.names, ['2', '1830', 'ESPECIALIZACION EN FINANZAS', '', 'Posgrado', 'Presencial', 'Bogotá, D.C.']]), [])
        self.assertEqual(self.extract(names=[['1', '1707', 'ESPECIALIZACION EN FINANZAS', '', 'Posgrado', 'Presencial', 'Santiago de Cali']]), [])


if __name__ == '__main__':
    unittest.main()
