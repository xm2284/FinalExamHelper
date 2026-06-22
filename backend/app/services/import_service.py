from collections.abc import Callable
from pathlib import Path

from .question_parser import parse_questions_from_text, should_use_ai_fallback


AIQuestionParser = Callable[[str, str], list[dict]]


def derive_bank_name(
    requested_name: str | None,
    course_name: str,
    original_filename: str | None = None,
) -> str:
    if requested_name and requested_name.strip():
        return requested_name.strip()
    if original_filename:
        filename = Path(original_filename).stem.replace("_", " ").replace("-", " ").strip()
        if filename:
            return filename
    course = course_name.strip()
    return f"{course}期末复习题库" if course else "未命名题库"


def parse_with_optional_ai(
    text: str,
    default_type: str,
    ai_fallback: AIQuestionParser | None = None,
) -> list[dict]:
    questions = parse_questions_from_text(text, default_type)
    if not should_use_ai_fallback(text, questions) or ai_fallback is None:
        return questions
    try:
        ai_questions = ai_fallback(text, default_type)
        return ai_questions or questions
    except Exception:
        if questions:
            return questions
        raise
