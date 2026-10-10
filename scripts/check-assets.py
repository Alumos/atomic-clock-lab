from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import subprocess
root = Path(__file__).resolve().parents[1] / 'site'
class References(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name not in {'src', 'href'} or not value:
                continue
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path:
                continue
            assert (root / unquote(url.path).lstrip('/')).exists(), value
References().feed((root/'index.html').read_text(encoding='utf-8'))
for path in root.glob('*.js'):
    subprocess.run(['node', '--check', str(path)], check=True)
assert (root/'assets/satellite.svg').is_file()
print('JavaScript syntax and all static assets passed.')
