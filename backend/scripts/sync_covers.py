"""Run the cover pipeline from the command line.

Single pass over books needing covers (new books, failed retries):
  .venv\\Scripts\\python -m scripts.sync_covers --limit 50
  .venv\\Scripts\\python -m scripts.sync_covers --all

Ignore the retry schedule and re-attempt everything:
  .venv\\Scripts\\python -m scripts.sync_covers --all --force

Keep running as a standalone worker (e.g. under a process manager):
  .venv\\Scripts\\python -m scripts.sync_covers --loop 21600

The same logic runs automatically inside the FastAPI app
(COVER_SYNC_ENABLED / COVER_SYNC_INTERVAL_HOURS in .env); this CLI exists for
one-off runs and deployments where the API and the worker are separated.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.cover_pipeline import sync_missing_covers  # noqa: E402


async def main_async(args: argparse.Namespace) -> None:
    while True:
        stats = await sync_missing_covers(
            limit=None if args.all else args.limit,
            concurrency=args.concurrency,
            force=args.force,
        )
        print(f"sync pass complete: {stats}", flush=True)
        if not args.loop:
            return
        await asyncio.sleep(args.loop)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    parser = argparse.ArgumentParser(description="Sync missing book covers")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--all", action="store_true", help="no limit")
    parser.add_argument("--concurrency", type=int, default=6)
    parser.add_argument(
        "--force", action="store_true", help="ignore the retry schedule"
    )
    parser.add_argument(
        "--loop",
        type=float,
        default=0,
        metavar="SECONDS",
        help="re-run forever with this many seconds between passes",
    )
    asyncio.run(main_async(parser.parse_args()))


if __name__ == "__main__":
    main()
