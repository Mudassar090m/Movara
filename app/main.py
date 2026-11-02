import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import engine
from app.routes import auth, conversations, documents, messages

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("studymate")

# ── CORS origins ──────────────────────────────────────────────────────────────
# Allow the Vite dev server on both 127.0.0.1 and localhost, plus any
# custom origin set via the CORS_ORIGIN environment variable.
import os as _os
_extra_origin = _os.environ.get("CORS_ORIGIN", "").strip()
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",  # Vite fallback when 5173 is taken
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]
if _extra_origin and _extra_origin not in CORS_ORIGINS:
    CORS_ORIGINS.append(_extra_origin)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="StudyMate AI",
    version="0.1.0",
    description=(
        "A local AI-powered study assistant. Upload PDFs, chat with an LLM, "
        "and ask questions using RAG. All inference runs locally via Ollama."
    ),
    contact={"name": "StudyMate AI"},
    license_info={"name": "MIT"},
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Must be added BEFORE exception handlers so error responses also carry
# the Access-Control-Allow-Origin header (otherwise the browser shows
# a misleading "Network Error" instead of the real status code).
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request logging middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        ms = (time.perf_counter() - start) * 1000
        logger.error("%s %s  UNHANDLED  %.0fms  %s", request.method, request.url.path, ms, exc, exc_info=True)
        raise
    ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s  %d  %.0fms", request.method, request.url.path, response.status_code, ms)
    return response

# ── Global exception handlers ─────────────────────────────────────────────────
# These run inside the CORSMiddleware stack, so they need to set CORS headers
# themselves for preflight / cross-origin requests. The simplest approach is to
# copy the origin from the request when it matches an allowed origin.

def _cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin", "")
    if origin in CORS_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


@app.exception_handler(SQLAlchemyError)
async def db_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred."},
        headers=_cors_headers(request),
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred."},
        headers=_cors_headers(request),
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(documents.router)
app.include_router(messages.router)

# ── Health endpoints ──────────────────────────────────────────────────────────
@app.get("/health", tags=["health"], summary="API health check")
def health_check():
    return {"status": "ok"}


@app.get("/health/db", tags=["health"], summary="Database connectivity check")
def health_check_db():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
    return {"status": "ok", "database": "connected" if result == 1 else "error"}
