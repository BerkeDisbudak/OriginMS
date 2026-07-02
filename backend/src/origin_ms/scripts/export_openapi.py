import json
from pathlib import Path

from origin_ms.main import create_app


def main() -> None:
    output = Path(__file__).resolve().parents[3] / "openapi.json"
    output.write_text(
        json.dumps(create_app().openapi(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
