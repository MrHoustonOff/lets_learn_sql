from fastapi import FastAPI

app = FastAPI(
    title="PGym API",
    description="Backend for PGym - PostgreSQL practice platform",
    version="0.1.0",
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "PGym Backend"}
