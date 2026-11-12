"""Logic tests for the data pipeline helpers (Python standard library only: `python -m unittest`).

IMPORTANT: these tests use FIXTURES and fake HTTP responses. They prove parsing, redaction, scanning and failure handling.
They do NOT prove that NASA servers can be reached. Real retrieval is proven only by running scripts/check_data_access.py.
All numbers below are synthetic fixtures, not NASA measurements.
"""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import check_data_access as cda  # noqa: E402
import check_no_secrets as cns  # noqa: E402
import pipeline_common as pc  # noqa: E402

FIXTURE_YEAR_CSV = "FIXTURE title line\nYear,Jan,Feb,J-D\n" + "".join(f"{y},0.01,0.02,0.03\n" for y in range(1880, 1990)) + "1990,***,0.02,0.03\n"
FIXTURE_NSIDC = "Year, Month, Day, Extent, Missing, Source Data\nYYYY, MM, DD, 10^6 sq km, 10^6 sq km, source\n" + "".join(
    f"{1979 + i // 365}, 1, 1, 1.0, 0, fixture\n" for i in range(1200))


class FakeResponse:
    def __init__(self, status=200, text="", payload=None, headers=None):
        self.status_code = status
        self.text = text
        self.content = text.encode("utf-8")
        self._payload = payload
        self.headers = headers or {}

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


class HelperTests(unittest.TestCase):
    def test_sha256_file_matches_known_value(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "x.txt"
            p.write_bytes(b"abc")
            self.assertEqual(pc.sha256_file(p), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")

    def test_load_dotenv_returns_names_only_skips_blank_and_never_overrides(self):
        with tempfile.TemporaryDirectory() as d:
            env = Path(d) / ".env"
            env.write_text("# comment\nEARTHDATA_TOKEN=\nTEST_KEY_A=alpha\nTEST_KEY_B=\"beta\"\nTEST_KEY_C=fromfile\n", encoding="utf-8")
            os.environ["TEST_KEY_C"] = "already-set"
            for k in ("TEST_KEY_A", "TEST_KEY_B"):
                os.environ.pop(k, None)
            names = pc.load_dotenv(env)
            self.assertEqual(sorted(names), ["TEST_KEY_A", "TEST_KEY_B"])
            self.assertEqual(os.environ["TEST_KEY_B"], "beta")
            self.assertEqual(os.environ["TEST_KEY_C"], "already-set")
            self.assertNotIn("EARTHDATA_TOKEN", names)
            for k in ("TEST_KEY_A", "TEST_KEY_B", "TEST_KEY_C"):
                os.environ.pop(k, None)

    def test_redact_hides_secret_values(self):
        os.environ["EARTHDATA_PASSWORD"] = "s3cretvalue"
        try:
            self.assertEqual(pc.redact("pw is s3cretvalue ok"), "pw is *** ok")
        finally:
            os.environ.pop("EARTHDATA_PASSWORD", None)

    def test_find_media_urls_dedupes_and_finds_nested(self):
        obj = {"a": [{"u": "https://x.test/v/movie.mp4"}, {"u": "https://x.test/v/movie.mp4"}],
               "b": {"d": "https://x.test/frames/4096/", "n": "not a url", "t": "https://x.test/page.html"}}
        self.assertEqual(pc.find_media_urls(obj), ["https://x.test/v/movie.mp4", "https://x.test/frames/4096/"])

    def test_strip_html(self):
        self.assertEqual(pc.strip_html("<p>Hello <b>world</b></p>\n  again"), "Hello world again")

    def test_summarize_year_csv_fixture(self):
        s = pc.summarize_year_csv(FIXTURE_YEAR_CSV)
        self.assertTrue(s["ok"])
        self.assertEqual(s["header"], ["Year", "Jan", "Feb", "J-D"])
        self.assertEqual((s["first_year"], s["last_year"], s["n_rows"]), (1880, 1990, 111))
        self.assertTrue(s["missing_marker_seen"])
        self.assertEqual(s["title_lines"], ["FIXTURE title line"])

    def test_summarize_year_csv_rejects_non_csv(self):
        self.assertFalse(pc.summarize_year_csv("<html>blocked</html>")["ok"])


class SecretScannerTests(unittest.TestCase):
    def test_flags_real_looking_secrets(self):
        self.assertTrue(cns.scan_text("EARTHDATA_PASSWORD" + "=" + "hunter2hunter2"))
        self.assertTrue(cns.scan_text("EARTHDATA_TOKEN" + "=" + "a" * 30))
        self.assertTrue(cns.scan_text("machine urs.earthdata.nasa.gov\nlogin someone\npassword something"))
        self.assertTrue(cns.scan_text("eyJ" + "a" * 20 + "." + "b" * 20 + "." + "c" * 20))

    def test_ignores_blank_template_and_placeholders(self):
        example = Path(__file__).resolve().parents[1] / ".env.example"
        self.assertEqual(cns.scan_text(example.read_text(encoding="utf-8")), [])
        self.assertEqual(cns.scan_text('$env:EARTHDATA_TOKEN = "<paste token>"'), [])
        self.assertEqual(cns.scan_text("EARTHDATA_PASSWORD" + "=" + chr(10) + "# next line"), [])


class CheckLogicTests(unittest.TestCase):
    """Fake network. Proves failure handling and parsing, not NASA reachability."""

    def test_svs_pass_reports_media(self):
        payload = {"title": "Fixture item", "description": "<p>text</p>", "media": [{"url": "https://x.test/a.mp4"}, {"url": "https://x.test/frames/"}]}
        r = cda.check_svs(1, get=lambda url, **k: FakeResponse(200, payload=payload))
        self.assertEqual(r.status, "PASS")
        self.assertEqual(r.access, "public")
        self.assertEqual(r.detail["mp4_urls"], ["https://x.test/a.mp4"])
        self.assertEqual(r.detail["frame_like_urls"], ["https://x.test/frames/"])

    def test_svs_http_error_is_a_clear_fail(self):
        r = cda.check_svs(1, get=lambda url, **k: FakeResponse(503))
        self.assertEqual(r.status, "FAIL")
        self.assertIn("503", r.detail)

    def test_svs_network_exception_is_a_fail_not_a_crash(self):
        def boom(url, **k):
            raise ConnectionError("offline")
        self.assertEqual(cda.check_svs(1, get=boom).status, "FAIL")

    def test_gistemp_pass_writes_file_and_hash(self):
        with tempfile.TemporaryDirectory() as d:
            r = cda.check_gistemp("GLB.Ts+dSST.csv", get=lambda url, **k: FakeResponse(200, text=FIXTURE_YEAR_CSV), raw_dir=Path(d))
            self.assertEqual(r.status, "PASS")
            self.assertEqual(len(r.detail["sha256"]), 64)
            self.assertTrue((Path(d) / "gistemp" / "GLB.Ts+dSST.csv").is_file())

    def test_gistemp_blocked_gives_manual_download_hint(self):
        with tempfile.TemporaryDirectory() as d:
            r = cda.check_gistemp("GLB.Ts+dSST.csv", get=lambda url, **k: FakeResponse(403), raw_dir=Path(d))
            self.assertEqual(r.status, "FAIL")
            self.assertIn("browser", r.detail)

    def test_gistemp_html_error_page_is_not_accepted_as_data(self):
        with tempfile.TemporaryDirectory() as d:
            r = cda.check_gistemp("GLB.Ts+dSST.csv", get=lambda url, **k: FakeResponse(200, text="<html>Access denied</html>"), raw_dir=Path(d))
            self.assertEqual(r.status, "FAIL")

    def test_nsidc_falls_back_to_second_filename(self):
        def get(url, **k):
            return FakeResponse(200, text=FIXTURE_NSIDC) if url.endswith("v3.0.csv") else FakeResponse(404)
        with tempfile.TemporaryDirectory() as d:
            r = cda.check_nsidc(get=get, raw_dir=Path(d))
            self.assertEqual(r.status, "PASS")
            self.assertTrue(r.detail["url"].endswith("v3.0.csv"))

    def test_nsidc_all_missing_lists_directory_files(self):
        listing = '<a href="N_seaice_extent_daily_v9.9.csv">x</a>'
        def get(url, **k):
            return FakeResponse(200, text=listing) if url == cda.NSIDC_BASE else FakeResponse(404)
        with tempfile.TemporaryDirectory() as d:
            r = cda.check_nsidc(get=get, raw_dir=Path(d))
            self.assertEqual(r.status, "FAIL")
            self.assertEqual(r.detail["csv_files_seen_in_directory_listing"], ["N_seaice_extent_daily_v9.9.csv"])

    def test_cmr_pass_and_empty(self):
        ok = {"feed": {"entry": [{"id": "C1", "short_name": "X", "version_id": "1", "title": "t"}]}}
        def get_ok(url, **k):
            return FakeResponse(200, payload=ok, headers={"CMR-Hits": "7"})
        r = cda.check_cmr("X", get=get_ok)
        self.assertEqual((r.status, r.detail["granule_count_reported_by_cmr"]), ("PASS", "7"))
        r2 = cda.check_cmr("X", get=lambda url, **k: FakeResponse(200, payload={"feed": {"entry": []}}))
        self.assertEqual(r2.status, "FAIL")

    def test_report_json_is_serializable(self):
        res = cda.CheckResult("n", "public", "PASS", {"a": [1, 2]})
        json.dumps(res.to_dict())


if __name__ == "__main__":
    unittest.main()
