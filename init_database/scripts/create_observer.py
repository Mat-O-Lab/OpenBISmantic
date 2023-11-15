import os
from pybis import Openbis

SERVER_HOST_PORT = os.getenv('SERVER_HOST_PORT')
o = Openbis(SERVER_HOST_PORT, verify_certificates=False)
try:
    observer = o.get_person('observer')
except ValueError:
    observer = o.new_person('observer')
    observer.save()
observer.assign_role('OBSERVER')
