import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return

    with path.open("r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


def load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        _load_env_file(PROJECT_DIR / ".env")
        _load_env_file(BASE_DIR / ".env")
    else:
        load_dotenv(PROJECT_DIR / ".env")
        load_dotenv(BASE_DIR / ".env")


load_env()


def get_env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


OPENAI_API_KEY = get_env("OPENAI_API_KEY")
OPENAI_DETECTING_API_KEY = get_env("OPENAI_DETECTING_API_KEY", OPENAI_API_KEY)
SEGMIND_API_KEY = get_env("SEGMIND_API_KEY")
STABLE_DIFFUSION_WEBUI_URL = get_env("STABLE_DIFFUSION_WEBUI_URL", "http://127.0.0.1:7860")
