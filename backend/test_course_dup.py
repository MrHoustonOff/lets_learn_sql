import asyncio
import os
import sys

# Add backend dir to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.sqlite_db import get_sqlite_conn
from db.repositories.courses import CourseRepository

async def main():
    conn = await get_sqlite_conn()
    repo = CourseRepository(conn)
    
    # Let's see what courses exist
    async with conn.execute("SELECT id, title, description FROM courses LIMIT 5") as cursor:
        courses = await cursor.fetchall()
        print("Existing courses:", [dict(c) for c in courses])
    
    if courses:
        first_course = courses[0]
        title = first_course["title"]
        desc = first_course["description"]
        c_id = first_course["id"]
        
        # Test 1: No exclude_id
        res1 = await repo.check_duplicate(title, desc)
        print(f"Test 1 (No exclude, checking '{title}'):", res1)
        
        # Test 2: With exclude_id
        res2 = await repo.check_duplicate(title, desc, exclude_id=c_id)
        print(f"Test 2 (Exclude ID {c_id}, checking '{title}'):", res2)
        
        # Test 3: String exclude_id
        res3 = await repo.check_duplicate(title, desc, exclude_id=str(c_id))
        print(f"Test 3 (Exclude string '{c_id}', checking '{title}'):", res3)
        
    await conn.close()

asyncio.run(main())
