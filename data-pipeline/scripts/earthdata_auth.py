#!/usr/bin/env python3
"""Local, secure NASA Earthdata Login helper for EARTHSONIC.

Only needed for datasets that REQUIRE login (currently PO.DAAC sea-level GMSL). Public sources never call this.

  python data-pipeline/scripts/earthdata_auth.py --status             # which route works (never prints secrets)
  python data-pipeline/scripts/earthdata_auth.py --setup-interactive  # one-time: type your password into a HIDDEN prompt

Credentials are read from, in order: environment variables (EARTHDATA_TOKEN, or EARTHDATA_USERNAME + EARTHDATA_PASSWORD, optionally
loaded from data-pipeline/.env which is git-ignored), then your user-folder _netrc/.netrc file. Nothing is ever written into this repository.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pipeline_common import load_dotenv


def try_login(strategies: tuple[str, ...] = ("environment", "netrc")):
    """Non-interactive login attempt. Returns (auth_or_None, how). Never prompts and never echoes exception text (it could contain account details)."""
    try:
        import earthaccess
    except ImportError:
        return None, "earthaccess is not installed (run: pip install -r data-pipeline/requirements.txt)"
    load_dotenv()
    for strategy in strategies:
        try:
            auth = earthaccess.login(strategy=strategy)
        except Exception:  # noqa: BLE001 - deliberately generic; message withheld on purpose
            continue
        if getattr(auth, "authenticated", False):
            return auth, strategy
    return None, "no usable credentials found (see data-pipeline/.env.example)"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Earthdata Login helper (never prints credentials).")
    parser.add_argument("--setup-interactive", action="store_true",
                        help="Prompt for username/password in THIS terminal and let earthaccess save them to your user folder.")
    args = parser.parse_args(argv)

    if args.setup_interactive:
        try:
            import earthaccess
        except ImportError:
            print("earthaccess is not installed. Run: pip install -r data-pipeline/requirements.txt")
            return 2
        print("You will be asked for your Earthdata username and password in this window.")
        print("The password prompt should be HIDDEN. If you can see what you type, press Ctrl+C and use the token route in .env.example instead.")
        print("Do NOT paste the password anywhere else (not in chat, not in files in this repository).")
        auth = earthaccess.login(strategy="interactive", persist=True)
        ok = bool(getattr(auth, "authenticated", False))
        print(f"Authenticated: {ok}")
        if ok:
            print(f"earthaccess saved your login in your user folder (Windows: {Path.home() / '_netrc'}), outside this repository.")
        return 0 if ok else 1

    auth, how = try_login()
    if auth is None:
        print(f"Authenticated: False. {how}")
        return 1
    print(f"Authenticated: True (route: {how})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
