import urllib.request
import urllib.error
import traceback
import sys

url = 'http://127.0.0.1:8000/api/catalog/products/'

try:
    req = urllib.request.Request(url)
    resp = urllib.request.urlopen(req)
    print('STATUS', resp.status)
    body = resp.read()
    try:
        print(body.decode())
    except Exception:
        print(body)
except urllib.error.HTTPError as e:
    print('HTTP ERROR', e.code)
    try:
        print(e.read().decode())
    except Exception:
        try:
            print(e.read())
        except Exception:
            pass
    traceback.print_exc()
    sys.exit(1)
except Exception:
    traceback.print_exc()
    sys.exit(1)
