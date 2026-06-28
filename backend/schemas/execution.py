from pydantic import BaseModel
from typing import List, Any

# From explain.py
class ExplainRequest(BaseModel):
    sql: str
    database: str = "northwind"   # TODO: MVP+ — мультибд
    admin_commit: bool = False

# From query.py
class QueryRequest(BaseModel):
    sql: str
    database: str = "northwind"   # TODO: MVP+ — мультибд
    admin_commit: bool = False

class QueryResponse(BaseModel):
    columns: List[str]
    rows: List[list]
    row_count: int
    duration_ms: float
    truncated: bool               # обрезан ли результат

# From submit.py
class SubmitRequest(BaseModel):
    sql: str
