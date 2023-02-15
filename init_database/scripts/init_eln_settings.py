import os
import json
import pathlib
from pybis import Openbis

SERVER_HOST_PORT = os.getenv('SERVER_HOST_PORT')
o = Openbis(SERVER_HOST_PORT, verify_certificates=False)
settings_sample = o.get_sample('/ELN_SETTINGS/GENERAL_ELN_SETTINGS')
with open(pathlib.Path(__file__).parent / 'default_eln_settings.json') as f:
    default_eln_settings = json.load(f)
settings_sample.props['$eln_settings'] = json.dumps(default_eln_settings)
settings_sample.save()
