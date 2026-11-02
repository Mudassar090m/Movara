import ollama

from app.config import settings


class OllamaError(Exception):
    """Raised when the local Ollama service is unavailable or returns an error."""


def _client() -> ollama.Client:
    return ollama.Client(
        host=settings.ollama_base_url, timeout=settings.ollama_request_timeout
    )


def chat(messages: list[dict]) -> str:
    """Send a chat history to the local Ollama model and return the reply text."""
    try:
        response = _client().chat(model=settings.ollama_model, messages=messages)
    except ollama.ResponseError as exc:
        # ResponseError covers model-not-found AND other server errors — check status.
        code = getattr(exc, "status_code", None)
        if code == 404 or "not found" in str(exc).lower():
            raise OllamaError(
                f"Model '{settings.ollama_model}' is not available locally. "
                f"Run: ollama pull {settings.ollama_model}"
            ) from exc
        raise OllamaError(f"Ollama returned an error: {exc}") from exc
    except (ConnectionError, OSError) as exc:
        # Raised when Ollama is not running or not reachable.
        raise OllamaError(
            f"Cannot reach Ollama at {settings.ollama_base_url}. Is it running? ({exc})"
        ) from exc
    except Exception as exc:
        raise OllamaError(f"Ollama call failed: {exc}") from exc

    try:
        return response.message.content
    except AttributeError as exc:
        raise OllamaError("Unexpected response shape from Ollama.") from exc
