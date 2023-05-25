import base64
import io

from fastapi import FastAPI, Request, Response
from starlette.responses import RedirectResponse, FileResponse
import pybis
from openbis_json_parser import parse_dict
from openbis_json_parser.parser import write_ontology

app = FastAPI(
    title='OpenBISmantic API',
)


class TurtleResponse(Response):
    media_type = 'application/turtle'

    def render(self, content):
        onto = parse_dict(content)
        out_file = io.BytesIO()
        write_ontology(onto, out_file, 'turtle')
        out_file.seek(0)
        return out_file.read()


@app.middleware('http')
async def add_pybis_session(request: Request, call_next):
    bis = pybis.Openbis('https://openbis:443', verify_certificates=False)
    auth_header = request.headers.get('authorization')
    accept_header = request.headers.get('accept', '').split(',')
    if auth_header is not None and ' ' in auth_header:
        auth_type, auth_value = auth_header.split(' ', 1)
        if auth_type.lower() == 'basic':
            un, pw = base64.b64decode(auth_value).decode('utf-8').split(':')
            print(f'logging in using {un=} {pw=}')
            bis.login(un, pw)
        elif auth_value.lower() == 'token':
            print(f'logging in using token={auth_value}')
            bis.set_token(auth_value)
    elif 'text/html' in accept_header:
        session_token = request.cookies.get('openbis')
        if session_token is None or session_token == 'null':
            return RedirectResponse(url='/openbis/webapp/eln-lims/')
        print(f'logging in using token={session_token}')
        bis.set_token(session_token)
    if not bis.is_session_active():
        return Response(status_code=401)
    request.state.bis = bis
    response = await call_next(request)
    return response


@app.middleware('http')
async def openbismantic_middleware(request: Request, call_next):
    accept_header = request.headers.get('accept', '').split(',')
    if 'text/html' in accept_header:
        return FileResponse('app.html')
    else:
        return await call_next(request)


@app.get('/')
async def index():
    return {'message': 'test'}


@app.get('/sample/{perm_id}')
async def get_sample(perm_id: str, request: Request):
    bis: pybis.Openbis = request.state.bis
    sample = bis.get_sample(perm_id)
    return TurtleResponse(sample.data)
