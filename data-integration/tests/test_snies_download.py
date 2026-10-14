"""Offline checks for the dynamic public JSF download form."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('refresh', Path(__file__).resolve().parents[1] / 'tools/refresh-snies-tuition.py')
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)


class DownloadFormTest(unittest.TestCase):
    def test_download_fields_stay_in_their_own_dynamic_form(self):
        parser = refresh.Forms()
        parser.feed('''<form action="/filters"><input name="token" value="wrong"></form>
        <form action="/programas;jsessionid=public"><input name="form17" value="form17">
        <button name="form17:export"><span>Descargar programas</span></button>
        <input name="javax.faces.ViewState" value="export-state"></form>''')
        forms = [f for f in parser.forms if any(b['text'] == 'Descargar programas' for b in f['buttons'])]
        self.assertEqual(len(forms), 1)
        self.assertEqual(forms[0]['fields']['javax.faces.ViewState'], 'export-state')
        self.assertNotIn('token', forms[0]['fields'])
        self.assertEqual(forms[0]['buttons'][0]['name'], 'form17:export')


if __name__ == '__main__':
    unittest.main()
