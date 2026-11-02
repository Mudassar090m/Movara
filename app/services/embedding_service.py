import ollama

from app.config import settings
from app.models import EMBEDDING_DIM
from app.services.ollama_service import OllamaError

# Maximum number of chunks to embed in a single Ollama call.
# Large PDFs can have hundreds of chunks; sending them all at once risks
# a timeout or an out-of-memory error on slow machines.
_BATCH_SIZE = 32


def embed(texts: list[str]) -> list[list[float]]:
    """Return one embedding vector per text using the configured embed model.

    Embeds in batches of _BATCH_SIZE to avoid overloading the model.
    Raises OllamaError if the model is unavailable or Ollama is unreachable.
    Raises ValueError if the returned vectors have the wrong dimension.
    """
    if not texts:
        return []

    client = ollama.Client(
        host=settings.ollama_base_url, timeout=settings.ollama_request_timeout
    )
    results: list[list[float]] = []

    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        try:
            response = client.embed(model=settings.ollama_embed_model, input=batch)
            vectors = response.embeddings
        except ollama.ResponseError as exc:
            code = getattr(exc, "status_code", None)
            if code == 404 or "not found" in str(exc).lower():
                raise OllamaError(
                    f"Embed model '{settings.ollama_embed_model}' not available. "
                    f"Run: ollama pull {settings.ollama_embed_model}"
                ) from exc
            raise OllamaError(f"Ollama embed error: {exc}") from exc
        except (ConnectionError, OSError) as exc:
            raise OllamaError(
                f"Cannot reach Ollama at {settings.ollama_base_url}. Is it running? ({exc})"
            ) from exc
        except Exception as exc:
            raise OllamaError(f"Embedding call failed: {exc}") from exc

        # Validate dimension so a model change gives a clear error, not a DB 500.
        for vec in vectors:
            if len(vec) != EMBEDDING_DIM:
                raise ValueError(
                    f"Embedding dimension mismatch: expected {EMBEDDING_DIM}, "
                    f"got {len(vec)}. Update EMBEDDING_DIM in models.py to match "
                    f"your OLLAMA_EMBED_MODEL."
                )

        results.extend(vectors)

    return results
