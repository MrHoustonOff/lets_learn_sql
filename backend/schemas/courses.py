from pydantic import BaseModel
from typing import List, Optional, Literal

# ---------------------------------------------------------------------------
# Read models
# ---------------------------------------------------------------------------

class CourseListItem(BaseModel):
    id: int
    title: str
    description: Optional[str]
    author_name: Optional[str]
    author_url: Optional[str]
    authors: List[dict]
    status: str
    sectionsCount: int
    tasksCount: int
    dbNames: List[str]
    progress: int

class TaskDetails(BaseModel):
    id: int
    title: str
    status: str  # 'done' | 'todo'
    bookmarked: bool

class SectionDetails(BaseModel):
    id: int
    title: str
    description: Optional[str]
    completed: int
    total: int
    progress: int
    tasks: List[TaskDetails]

class CourseDetails(BaseModel):
    id: int
    title: str
    description: Optional[str]
    authors: List[dict]
    dbNames: List[str]
    totalTasks: int
    totalSections: int
    progress: int
    completedTasks: int
    sections: List[SectionDetails]
    status: str

# ---------------------------------------------------------------------------
# Write / Action models
# ---------------------------------------------------------------------------

class SectionInput(BaseModel):
    title: str
    description: Optional[str] = None
    task_ids: List[int] = []

class AuthorInput(BaseModel):
    name: str
    link: Optional[str] = ""

class CourseCreateRequest(BaseModel):
    title: str
    description: str
    status: Literal["draft", "published"] = "published"
    authors: List[AuthorInput] = []
    sections: List[SectionInput] = []

class CourseUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["draft", "published"]] = None
    authors: Optional[List[AuthorInput]] = None
    sections: Optional[List[SectionInput]] = None

class CourseWriteResponse(BaseModel):
    id: int
    status: str

class CheckDuplicateCourseRequest(BaseModel):
    title: str
    description: Optional[str] = None
    exclude_id: Optional[int] = None
