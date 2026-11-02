# StudyMate AI

A local AI study assistant. Upload PDFs, chat with an LLM, and ask questions about your documents using RAG. All inference runs locally via Ollama — no data leaves your machine.

## Prerequisites

- Python 3.11+
- PostgreSQL 15+ with the **pgvector** extension available  
  (`CREATE EXTENSION IF NOT EXISTS vector` requires a superuser; the migration handles it automatically if your DB user has superuser rights, otherwise run it manually first)
- [Ollama](https://ollama.com/) installed and running locally
- Node.js 18+ (for the frontend)

## Local setup

### 1. Pull the required Ollama models

```
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 2. Create the PostgreSQL database and user

Open a `psql` session as the `postgres` superuser and run:

```sql
CREATE USER studymate_user WITH PASSWORD 'studymate_pass';
CREATE DATABASE studymate OWNER studymate_user;
-- Grant superuser so the migration can enable pgvector, or enable it manually:
-- CREATE EXTENSION IF NOT EXISTS vector;
GRANT ALL PRIVILEGES ON DATABASE studymate TO studymate_user;
```

### 3. Set up the Python backend

```bash
# Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\activate          # Windows
# source .venv/bin/activate       # macOS / Linux

# Install backend dependencies
pip install -r requirements.txt

# Copy the environment template and review the values
copy .env.example .env            # Windows
# cp .env.example .env            # macOS / Linux

# Run database migrations (creates all tables and enables pgvector)
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload
```

The API is now available at http://127.0.0.1:8000  
Interactive docs: http://127.0.0.1:8000/docs

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The app is now available at http://localhost:5173

## Running tests

```bash
# From the project root with the virtual environment active
pytest
```

> Tests require a separate test database. Set `TEST_DATABASE_URL` in `.env` or the environment before running.

## Project structure

```
app/               FastAPI application (routes, services, models)
alembic/           Database migrations
frontend/          React + Vite frontend
uploads/           Uploaded PDFs (gitignored)
tests/             pytest test suite
```

## Environment variables

See `.env.example` for all available settings. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret (generate a random one) |
| `OLLAMA_MODEL` | Chat model (default: `llama3.2`) |
| `OLLAMA_EMBED_MODEL` | Embedding model (default: `nomic-embed-text`) |
| `OLLAMA_REQUEST_TIMEOUT` | Ollama request timeout in seconds (default: `300`) |
| `UPLOAD_DIR` | Directory for uploaded PDFs (default: `uploads`) |
| `MAX_UPLOAD_BYTES` | Maximum upload size in bytes (default: `10485760` = 10 MB) |
