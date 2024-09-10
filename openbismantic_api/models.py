import pydantic
from pydantic.main import BaseModel


class ExportRequest(BaseModel):
    graph: pydantic.Json[object]
