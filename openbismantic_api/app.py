import base64
import io

from fastapi import FastAPI, Request, Response
from fastapi.templating import Jinja2Templates
from starlette.responses import RedirectResponse
import pybis
from openbis_json_parser import parse_dict
from openbis_json_parser.parser import write_ontology

app = FastAPI(
    title='OpenBISmantic API',
)
templates = Jinja2Templates(directory='templates')


class OpenBISmanticResponse(Response):
    media_type = 'application/x-turtle'

    def __init__(self, *args, request=None, **kwargs):
        self.request = request
        accept_header = request.headers.get('accept', '').split(',')
        if 'text/html' in accept_header:
            self.media_type = 'text/html'
        elif 'application/turtle' in accept_header:
            self.media_type = 'application/x-turtle'
        elif 'application/ld+json' in accept_header:
            self.media_type = 'application/ld+json'
        super().__init__(*args, **kwargs)

    def render(self, content):
        onto = parse_dict(content)
        if self.media_type == 'text/html':
            template = templates.get_template('app.html')
            return template.render({'request': self.request, 'onto': onto})
        out_file = io.BytesIO()
        export_format = {
            'application/x-turtle': 'turtle',
            'application/ld+json': 'json-ld'
        }.get(self.media_type, 'turtle')
        write_ontology(onto, out_file, export_format)
        out_file.seek(0)
        return out_file.read()


@app.middleware('http')
async def add_pybis_session(request: Request, call_next):
    bis = pybis.Openbis('https://openbis:443', verify_certificates=False)
    bis.logout()
    auth_header = request.headers.get('authorization')
    accept_header = request.headers.get('accept', '').split(',')
    if auth_header is not None and ' ' in auth_header:
        auth_type, auth_value = auth_header.split(' ', 1)
        if auth_type.lower() == 'basic':
            un, pw = base64.b64decode(auth_value).decode('utf-8').split(':')
            bis.login(un, pw)  # todo: catch exception?
        elif auth_type.lower() == 'token':
            bis.__dict__['token'] = auth_value
    elif 'text/html' in accept_header:
        session_token = request.cookies.get('openbis')
        if session_token is None or session_token == 'null':
            return RedirectResponse(url='/openbis/webapp/eln-lims/')
        bis.__dict__['token'] = session_token
    if not bis.is_session_active():
        if 'text/html' in accept_header:
            return RedirectResponse(url='/openbis/webapp/eln-lims/')
        else:
            return Response('unauthorized', status_code=401)
    request.state.bis = bis
    response = await call_next(request)
    return response


@app.get('/')
async def index():
    return {'message': 'test'}


@app.get('/sample/{perm_id}')
async def get_sample(perm_id: str, request: Request):
    bis: pybis.Openbis = request.state.bis
    try:
        sample = bis.get_sample(perm_id)
    except ValueError:
        return Response('sample not found', status_code=404)
    return OpenBISmanticResponse(sample.data, request=request)
