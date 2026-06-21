from pydantic import BaseModel
from typing import List, Optional

class DraftListItem(BaseModel):
    id: int
    type: str
    title: str
    step: str
    updatedAt: str
    difficulty: Optional[int] = None
    tags: Optional[List[dict]] = None
