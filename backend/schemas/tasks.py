from pydantic import BaseModel
from typing import Optional, List

class TagOut(BaseModel):
    id: int
    name: str

class CourseOut(BaseModel):
    id: int
    title: str

class TaskListItem(BaseModel):
    id: int
    title: str
    difficulty: Optional[int]
    database_id: int
    db_name: str
    db_display_name: str
    is_solved: bool
    is_flagged: bool
    tags: List[TagOut]
    courses: List[CourseOut]
    created_at: str
    solved_at: Optional[str]

class TasksListResponse(BaseModel):
    tasks: List[TaskListItem]
    total: int
    tags: List[TagOut]
    courses: List[CourseOut]
    databases: List[dict]

class TaskResponse(BaseModel):
    id: int
    title: Optional[str]
    difficulty: Optional[int]
    description: Optional[str]
    hint: Optional[str]
    database_id: Optional[int]
    db_name: Optional[str]
    is_bookmarked: bool
    is_solved: bool
    author_name: Optional[str] = None
    source_url: Optional[str] = None
    reference_sql: Optional[str] = None
    status: str
    order_matters: bool
    tags: List[str] = []
    courses: List[CourseOut] = []
    rules: List[dict] = []

class RuleInput(BaseModel):
    category: str
    condition: str
    params: dict
    severity: str = "blocking"
    message: str = ""

class DraftUpdateInput(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    author_name: Optional[str] = None
    source_url: Optional[str] = None
    difficulty: Optional[str] = None
    database_id: Optional[int] = None
    reference_sql: Optional[str] = None
    order_matters: Optional[bool] = None
    tags: List[str] = []
    rules: List[RuleInput] = []

class CheckDuplicateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    exclude_id: Optional[int] = None

class SolutionResponse(BaseModel):
    solution_sql: str
    columns: List[str]
    rows: List[List]
    row_count: int
    duration_ms: float

class CheckRulesRequest(BaseModel):
    rules: List[RuleInput]
