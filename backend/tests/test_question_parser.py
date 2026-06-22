import json

from app.services.question_parser import (
    evaluate_objective_answer,
    parse_questions_from_text,
    should_use_ai_fallback,
)


def test_parse_questions_returns_structured_options_and_knowledge_points():
    text = """1. HTML 的主要作用是什么？
A. 描述网页结构
B. 管理数据库
C. 编译操作系统
D. 训练模型
答案：A
解析：HTML 用于描述网页结构。
知识点：HTML基础,网页结构
"""

    questions = parse_questions_from_text(text, "single")

    assert len(questions) == 1
    assert questions[0]["content"] == "HTML 的主要作用是什么？"
    assert questions[0]["options"][0] == {"label": "A", "content": "描述网页结构"}
    assert questions[0]["answer"] == "A"
    assert questions[0]["knowledge_points"] == ["HTML基础", "网页结构"]


def test_parse_json_question_file_shape():
    payload = json.dumps(
        [
            {
                "content": "JavaScript 可以操作 DOM。",
                "question_type": "judge",
                "answer": "正确",
                "difficulty": 2,
            }
        ],
        ensure_ascii=False,
    )

    questions = parse_questions_from_text(payload, "single")

    assert questions[0]["question_type"] == "judge"
    assert questions[0]["difficulty"] == 2


def test_multiple_choice_answer_ignores_order_and_separators():
    assert evaluate_objective_answer("multiple", "A,C", "C A") is True


def test_fill_answer_normalizes_whitespace_and_case():
    assert evaluate_objective_answer("fill", "Document Object Model", " document  object model ") is True


def test_parse_multiple_questions_without_question_numbers():
    text = """HTML 的主要作用是什么？
A. 描述网页结构
B. 管理数据库
答案：A

CSS 的主要作用是什么？
A. 控制页面样式
B. 编译 JavaScript
答案：A
"""

    questions = parse_questions_from_text(text, "single")

    assert [question["content"] for question in questions] == [
        "HTML 的主要作用是什么？",
        "CSS 的主要作用是什么？",
    ]
    assert [question["answer"] for question in questions] == ["A", "A"]


def test_ai_fallback_is_requested_when_rule_parser_misses_answer_blocks():
    text = """第一道题
答案：A

第二道题
答案：B
"""
    parsed = [{"content": "第一道题", "answer": "A"}]

    assert should_use_ai_fallback(text, parsed) is True
