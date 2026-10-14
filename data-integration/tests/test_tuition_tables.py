import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('tables', Path(__file__).resolve().parents[1] / 'tools/collect-tuition-tables.py')
tables = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tables)
SOURCE = 'https://www.uao.edu.co/wp-content/uploads/2025/12/Res-CS-757-Valor-Matricula-pregrado-2026.pdf'
NAMES = [
    ['1', '1830', 'CINE', 'PROFESIONAL', 'Pregrado', 'Presencial', 'Santiago de Cali'],
    ['2', '1830', 'NARRATIVAS', 'PROFESIONAL', 'Pregrado', 'Presencial-Virtual', 'Santiago de Cali'],
    ['3', '1830', 'ADMINISTRACION DE EMPRESAS', 'PROFESIONAL', 'Pregrado', 'Dual', 'Santiago de Cali'],
]


def document():
    rows = ['CINE $ 10.906.000 $ 10.906.000', 'ADMINISTRACION DE EMPRESAS (MODALIDAD DUAL) $ 10.669.000 $ 10.669.000']
    rows += [f'NO VINCULADO {i} $ 1.000.000 $ 1.000.000' for i in range(18)]
    hybrid = ['NARRATIVAS $ 9.442.000 $ 9.442.000'] + [f'OTRO {i} $ 1.000.000 $ 1.000.000' for i in range(4)]
    night = ['ADMINISTRACION DE EMPRESAS $ 7.213.000 $ 7.213.000'] + [f'NOCTURNO {i} $ 1.000.000 $ 1.000.000' for i in range(7)]
    return '\n'.join(['AÑO 2026',
                      'ARTÍCULO 2º: Para los estudiantes nuevos que ingresan en el año 2026 para cada programa diurno en modalidad presencial con rango entre 10 y 18 créditos.',
                      'PROGRAMA VALOR', *rows,
                      'ARTÍCULO 3º: Para los estudiantes nuevos que ingresan en el año 2026 en modalidad presencial – virtual con rango entre 10 y 18 créditos.',
                      'PROGRAMA VALOR', *hybrid,
                      'ARTÍCULO 4º: Para cada programa nocturno en modalidad presencial.',
                      'PROGRAMA VALOR', *night,
                      'ARTÍCULO 5º: Estudiantes antiguos de otras cohortes.',
                      'CINE $ 9.999.000 $ 9.999.000'])


class TuitionTablesTest(unittest.TestCase):
    def extract(self, text, names=NAMES):
        return tables.extract_uao([text], names, SOURCE, '2026-10-14', 'verified-hash')

    def test_new_student_table_does_not_take_old_cohort_or_night_prices(self):
        rows, pending = self.extract(document())
        self.assertEqual({r['sniesCode']: r['amount'] for r in rows}, {'1': 10906000, '2': 9442000, '3': 10669000})
        self.assertTrue(all(r['billingPeriod'] == 'ACADEMIC_PERIOD' for r in rows))
        self.assertTrue(all('10 a 18' in r['note'] for r in rows))

    def test_unresolved_programs_never_receive_another_institutions_price(self):
        names = [[n[0], '1702', *n[2:]] for n in NAMES]
        self.assertEqual(self.extract(document(), names)[0], [])
        self.assertEqual(self.extract(document(), NAMES + [NAMES[0]])[0][0]['sniesCode'], '3')

    def test_changed_year_load_or_modality_fail_closed(self):
        for text in [document().replace('2026', '2025'), document().replace('entre 10 y 18', 'entre 5 y 8'), document().replace('diurno en modalidad presencial', 'diurno en modalidad virtual')]:
            with self.assertRaises(ValueError):
                self.extract(text)

    def test_different_period_prices_are_pending_and_cents_are_never_truncated(self):
        text = document().replace('CINE $ 10.906.000 $ 10.906.000', 'CINE $ 10.906.000 $ 11.000.000')
        rows, pending = self.extract(text)
        self.assertNotIn('1', [r['sniesCode'] for r in rows])
        self.assertTrue(any(r['reason'] == 'DIFFERENT_PERIOD_PRICES' for r in pending))
        with self.assertRaises(ValueError):
            self.extract(document().replace('CINE $ 10.906.000 $ 10.906.000', 'CINE $ 10.906.000,50 $ 10.906.000'))


if __name__ == '__main__':
    unittest.main()
