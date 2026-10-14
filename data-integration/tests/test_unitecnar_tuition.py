import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('unitecnar', Path(__file__).parents[1] / 'tools/collect-unitecnar-tuition.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class UnitecnarTests(unittest.TestCase):
    labels = ['Técnica Profesional Presencial', 'Técnica Profesional a Distancia', 'Tecnología Presencial', 'Tecnología Distancia', 'Tecnología Virtual', 'Universitaria Presencial', 'Universitaria Virtual']
    text = 'Fijar para el año lectivo del 2026 MODALIDAD EXCEPCIONAL ORDINARIA EXTRAORDINARIA\n' + '\n'.join(l + ' 2.799.008 3.110.009 3.421.010' for l in labels) + '\nTecnología en Gestión Gastronómica el valor de la matrícula será de: 3.619.467 3.981.414 Incluye el costo del uniforme. MATRÍCULA HASTA 8 CRÉDITOS 50% DEL VALOR DE LA MATRÍCULA ESTABLECIDO'
    names = [['1', '3710', 'TECNOLOGIA EN LOGISTICA', '', 'Pregrado', 'Presencial', 'Cartagena de Indias']]
    details = [['1', '3710', 'Presencial', 'Cartagena de Indias', 'Tecnológico', '100', '6', 'Semestral']]

    def extract(self, text=None, names=None, details=None):
        return m.extract_unitecnar([self.text if text is None else text], self.names if names is None else names, self.details if details is None else details, m.SOURCE, '2026-10-14', 'a' * 64)[0]

    def test_ordinary_column_not_exceptional_or_extraordinary(self):
        r = self.extract()[0]
        self.assertEqual(r['amount'], 3110009)
        self.assertIn('superior a ocho créditos', r['note'])

    def test_requires_formation_and_modality_from_same_official_identity(self):
        self.assertEqual(self.extract(details=[]), [])
        self.assertEqual(self.extract(details=[self.details[0], [*self.details[0][:4], 'Universitario', '100', '6', 'Semestral']]), [])
        self.assertEqual(self.extract(details=[['1', '3710', 'Virtual', *self.details[0][3:]]]), [])

    def test_gastronomy_specific_rate_and_unknown_exception(self):
        n = ['1', '3710', 'TECNOLOGIA EN GESTIÓN GASTRONOMICA', '', 'Pregrado', 'Presencial', 'Cartagena de Indias']
        self.assertEqual(self.extract(names=[n])[0]['amount'], 3619467)
        self.assertEqual(self.extract(names=[['1', '3710', 'OTRA GASTRONOMIA', '', 'Pregrado', 'Presencial', 'Cartagena de Indias']]), [])

    def test_wrong_year_columns_or_missing_exception_fails_closed(self):
        for text in [self.text.replace('2026', '2025'), self.text.replace('EXCEPCIONAL ORDINARIA EXTRAORDINARIA', 'ORDINARIA EXCEPCIONAL EXTRAORDINARIA'), self.text.replace('Tecnología en Gestión Gastronómica', 'Otra excepción'), self.text.replace('HASTA 8 CRÉDITOS', 'HASTA 6 CRÉDITOS')]:
            with self.assertRaises(ValueError):
                self.extract(text)

    def test_no_cross_institution_or_extension_campus(self):
        for change in [['1', '3711', *self.names[0][2:]], [*self.names[0][:6], 'Pereira']]:
            self.assertEqual(self.extract(names=[change]), [])


if __name__ == '__main__':
    unittest.main()
