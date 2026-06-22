from app.services.import_service import derive_bank_name, parse_with_optional_ai


def test_derive_bank_name_prefers_original_filename():
    assert derive_bank_name("", "高等数学", "高数期末题.docx") == "高数期末题"


def test_derive_bank_name_uses_course_for_pasted_text():
    assert derive_bank_name("", "数据结构") == "数据结构期末复习题库"


def test_parse_with_optional_ai_only_falls_back_when_rules_are_incomplete():
    text = """第一道题
答案：A
第二道题
答案：B
"""
    fallback_calls: list[str] = []

    def fallback(source: str, _default_type: str):
        fallback_calls.append(source)
        return [
            {"content": "第一道题", "answer": "A"},
            {"content": "第二道题", "answer": "B"},
        ]

    result = parse_with_optional_ai(text, "single", fallback)

    assert len(result) == 2
    assert fallback_calls == [text]
