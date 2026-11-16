"""Optional generation-tool regression checks; not required to build the game."""
from pathlib import Path
import runpy
import unittest
from kokoro_onnx.tokenizer import Tokenizer

generator = runpy.run_path(str(Path(__file__).resolve().parents[1] / "scripts/generate-heart.py"))


class LetterPronunciationTest(unittest.TestCase):
    def test_a_keeps_its_letter_name_inside_prompts(self):
        tokenizer = Tokenizer()
        phonemes = generator["letter_phonemes"]
        self.assertEqual(phonemes("A. The letter A is for apple.", tokenizer).count("ˈeɪ"), 2)
        self.assertIn("ˈeɪ", phonemes("Look for A. Follow the gentle glow.", tokenizer))
        self.assertIn("ˈeɪ", phonemes("Can you find the letter A?", tokenizer))

    def test_contractions_are_not_letter_tokens(self):
        pattern = generator["LETTER"]
        self.assertIsNone(pattern.search("Hello! I'm Milo. Let’s explore together."))
        self.assertIsNone(pattern.search("Hello! I’m Pip. Let’s explore together."))

    def test_x_is_named_before_its_example_word(self):
        value = generator["letter_phonemes"]("X. The letter X is at the end of fox.", Tokenizer())
        self.assertEqual(value.count("ˈɛks"), 2)


if __name__ == "__main__":
    unittest.main()
