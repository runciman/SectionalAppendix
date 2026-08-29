#!/usr/bin/env python3
"""Focused tests for conservative map-header recognition."""

import unittest

from scripts.prepare_index_batch import recognised_header


class RecognisedHeaderTests(unittest.TestCase):
    def test_scotland_header_and_known_ocr_confusion(self) -> None:
        self.assertEqual(recognised_header("SC031 Seq. 021 Location"), ("SC031", "021"))
        self.assertEqual(recognised_header("5C 031 | 022 | Location"), ("SC031", "022"))

    def test_western_header_with_table_separators(self) -> None:
        self.assertEqual(
            recognised_header("LOR Seq. Line of Route GW/103 | 003 | Paddington"),
            ("GW103", "003"),
        )

    def test_lor_without_sequence_remains_for_visual_review(self) -> None:
        self.assertEqual(recognised_header("GW103 Paddington to Uffington"), ("GW103", None))

    def test_unapproved_prefix_is_not_guessed(self) -> None:
        self.assertEqual(recognised_header("MLN1 000 150 000"), (None, None))


if __name__ == "__main__":
    unittest.main()
