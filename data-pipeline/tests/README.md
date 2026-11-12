# data-pipeline/tests

`test_pipeline_logic.py` uses the standard-library `unittest` (no install needed): `python -m unittest discover -s data-pipeline/tests`.
It uses FIXTURES and fake HTTP responses to test parsing, redaction, the secret scanner and failure handling.
It does not prove that NASA can be reached. `scripts/check_data_access.py` does that.
