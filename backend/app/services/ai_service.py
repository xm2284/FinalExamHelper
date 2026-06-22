import json
from collections.abc import Iterator
from typing import Any

import httpx
from sqlalchemy.orm import Session

from ..models import AISettings, Question


def get_settings(db: Session) -> AISettings:
    settings = db.query(AISettings).first()
    if not settings:
        settings = AISettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def build_ai_payload(
    settings: AISettings,
    prompt: str,
    *,
    temperature: float | None = None,
    max_completion_tokens: int = 1024,
    stream: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": settings.model_name,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": settings.temperature if temperature is None else temperature,
        "max_completion_tokens": max_completion_tokens,
        "stream": stream,
    }
    if "xiaomimimo.com" in settings.api_base_url:
        payload["thinking"] = {"type": "disabled"}
    return payload


def call_ai(
    db: Session,
    prompt: str,
    temperature: float | None = None,
    max_completion_tokens: int = 1024,
) -> str:
    settings = get_settings(db)
    if not settings.is_enabled or not settings.api_key:
        raise ValueError("AI 尚未配置或已关闭")
    payload = build_ai_payload(
        settings,
        prompt,
        temperature=temperature,
        max_completion_tokens=max_completion_tokens,
    )
    with httpx.Client(timeout=60) as client:
        response = client.post(
            f"{settings.api_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.api_key}"},
            json=payload,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


def stream_ai(
    db: Session,
    prompt: str,
    *,
    temperature: float = 0.2,
    max_completion_tokens: int = 320,
) -> Iterator[str]:
    settings = get_settings(db)
    if not settings.is_enabled or not settings.api_key:
        raise ValueError("AI 尚未配置或已关闭")
    payload = build_ai_payload(
        settings,
        prompt,
        temperature=temperature,
        max_completion_tokens=max_completion_tokens,
        stream=True,
    )
    with httpx.Client(timeout=60) as client:
        with client.stream(
            "POST",
            f"{settings.api_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.api_key}"},
            json=payload,
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    break
                chunk = json.loads(data)
                choices = chunk.get("choices") or []
                if not choices:
                    continue
                content = (choices[0].get("delta") or {}).get("content")
                if content:
                    yield content


def parse_json_output(content: str) -> Any:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        cleaned = cleaned.rsplit("```", 1)[0]
    return json.loads(cleaned)


def generate_questions(db: Session, material: str, count: int) -> list[dict]:
    prompt = f"""你是一名严谨的大学课程教师。只根据下方资料生成 {count} 道复习题，
不得补充资料中不存在的事实。输出纯 JSON 数组，每项字段为 content、question_type、
options（数组，元素含 label/content）、answer、explanation、difficulty（1-5）、
knowledge_points（字符串数组）、source_text。题型可为 single、multiple、judge、fill、essay。

资料：
{material[:12000]}
"""
    result = parse_json_output(call_ai(db, prompt, max_completion_tokens=4096))
    if not isinstance(result, list):
        raise ValueError("AI 返回内容不是题目数组")
    return result[:count]


def normalize_question_text(
    db: Session, material: str, default_type: str = "single"
) -> list[dict]:
    prompt = f"""请把下面可能没有题号、排版不统一的题目文本整理为结构化题目。
只能整理原文中存在的信息，不要编造题目或答案。识别题目边界、选项、答案、解析和知识点。
只输出 JSON 数组，每项字段为 content、question_type、options、answer、explanation、
difficulty、knowledge_points、source_text。question_type 默认可使用 {default_type}。

原文：
{material[:16000]}
"""
    result = parse_json_output(
        call_ai(db, prompt, temperature=0, max_completion_tokens=4096)
    )
    if not isinstance(result, list):
        raise ValueError("AI 整理结果不是题目数组")
    from .question_parser import parse_questions_from_text

    return parse_questions_from_text(
        json.dumps(result, ensure_ascii=False), default_type
    )


def explain_question(db: Session, question: Question, user_answer: str = "") -> str:
    return call_ai(
        db,
        explanation_prompt(question, user_answer),
        temperature=0.2,
        max_completion_tokens=320,
    )


def explanation_prompt(question: Question, user_answer: str = "") -> str:
    return f"""请用简洁、易读的中文讲解这道题，控制在 250 字以内。
按“考点、关键推理、易错点”三个短段落回答，不展示内部思考过程。
题目：{question.content}
学生答案：{user_answer or '未提供'}
正确答案：{question.answer}
原解析：{question.explanation or '无'}"""


def stream_question_explanation(
    db: Session, question: Question, user_answer: str = ""
) -> Iterator[str]:
    return stream_ai(
        db,
        explanation_prompt(question, user_answer),
        temperature=0.2,
        max_completion_tokens=320,
    )


def grade_subjective(db: Session, question: Question, user_answer: str) -> dict[str, Any]:
    result = parse_json_output(
        call_ai(
            db,
            f"""请评阅大学生主观题答案，只输出 JSON：
{{"is_correct": true/false, "score": 0到100, "feedback": "具体反馈"}}
题目：{question.content}
参考答案：{question.answer}
学生答案：{user_answer}""",
            temperature=0,
            max_completion_tokens=300,
        )
    )
    return {
        "is_correct": bool(result.get("is_correct")),
        "score": int(result.get("score", 0)),
        "feedback": str(result.get("feedback", "")),
    }


def analyze_wrong_answer(db: Session, question: Question, user_answer: str) -> str:
    return call_ai(
        db,
        f"""请分析学生答错这道题的具体原因，并给出一条可执行的复习建议。
优先判断：概念不清、审题错误、选项混淆、公式记错、知识点遗漏或关键词忽略。
题目：{question.content}
学生答案：{user_answer or '未提供'}
正确答案：{question.answer}
知识点：{question.knowledge_points_json}
不要泛泛而谈，控制在 200 字以内。""",
        temperature=0.2,
        max_completion_tokens=300,
    )
