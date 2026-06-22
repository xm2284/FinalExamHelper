import json
import re
from typing import Any


QUESTION_START = re.compile(r"(?m)^\s*(?:第\s*)?(\d+)\s*(?:题|[.、．)）])\s*")
QUESTION_LABEL = re.compile(r"^\s*(?:题目|问题|问)\s*[:：]\s*")
OPTION_LINE = re.compile(r"^\s*[\(（]?([A-H])[\)）.、．:：]\s*(.+?)\s*$")
ANSWER_LINE = re.compile(r"^\s*(?:答案|参考答案|正确答案|答)\s*[:：]?\s*(.+?)\s*$")
EXPLANATION_LINE = re.compile(r"^\s*解析\s*[:：]\s*(.+?)\s*$")
KNOWLEDGE_LINE = re.compile(r"^\s*知识点\s*[:：]\s*(.+?)\s*$")


def _normalise_question(raw: dict[str, Any], default_type: str) -> dict[str, Any]:
    options = raw.get("options") or []
    if isinstance(options, str):
        try:
            options = json.loads(options)
        except json.JSONDecodeError:
            options = []
    knowledge_points = raw.get("knowledge_points") or []
    if isinstance(knowledge_points, str):
        try:
            parsed = json.loads(knowledge_points)
            knowledge_points = parsed if isinstance(parsed, list) else [knowledge_points]
        except json.JSONDecodeError:
            knowledge_points = [
                item.strip() for item in re.split(r"[,，、]", knowledge_points) if item.strip()
            ]
    question_type = raw.get("question_type") or default_type
    answer = str(raw.get("answer") or "").strip()
    if answer in {"正确", "错误", "对", "错", "true", "false"}:
        question_type = "judge"
    return {
        "content": str(raw.get("content") or "").strip(),
        "question_type": question_type,
        "options": options,
        "answer": answer,
        "explanation": raw.get("explanation"),
        "difficulty": max(1, min(5, int(raw.get("difficulty") or 1))),
        "knowledge_points": knowledge_points,
        "source_text": raw.get("source_text"),
    }


def _next_nonempty_line(lines: list[str], start: int) -> str:
    for line in lines[start:]:
        if line.strip():
            return line.strip()
    return ""


def _split_unnumbered_blocks(text: str) -> list[str]:
    lines = text.splitlines()
    blocks: list[str] = []
    current: list[str] = []
    has_answer = False
    separated_after_answer = False

    for index, raw_line in enumerate(lines):
        line = raw_line.strip()
        if not line:
            if current:
                current.append("")
            if has_answer:
                separated_after_answer = True
            continue

        next_line = _next_nonempty_line(lines, index + 1)
        starts_option_group = bool(
            OPTION_LINE.match(next_line)
            and OPTION_LINE.match(next_line).group(1) == "A"
        )
        starts_labeled_question = bool(QUESTION_LABEL.match(line))
        looks_like_question = line.endswith(("?", "？")) and starts_option_group
        if has_answer and (
            starts_labeled_question
            or looks_like_question
            or (separated_after_answer and not (EXPLANATION_LINE.match(line) or KNOWLEDGE_LINE.match(line)))
        ):
            block = "\n".join(current).strip()
            if block:
                blocks.append(block)
            current = []
            has_answer = False
            separated_after_answer = False

        current.append(line)
        if ANSWER_LINE.match(line):
            has_answer = True

    block = "\n".join(current).strip()
    if block:
        blocks.append(block)
    return blocks


def should_use_ai_fallback(text: str, questions: list[dict[str, Any]]) -> bool:
    answer_blocks = sum(
        1 for line in text.splitlines() if ANSWER_LINE.match(line.strip())
    )
    return not questions or (answer_blocks > 0 and len(questions) < answer_blocks)


def parse_questions_from_text(text: str, default_type: str = "single") -> list[dict[str, Any]]:
    cleaned = text.strip().lstrip("\ufeff")
    if not cleaned:
        return []

    try:
        payload = json.loads(cleaned)
        if isinstance(payload, dict):
            payload = payload.get("questions", [])
        if isinstance(payload, list):
            return [
                q for q in (_normalise_question(item, default_type) for item in payload)
                if q["content"] and q["answer"]
            ]
    except json.JSONDecodeError:
        pass

    starts = list(QUESTION_START.finditer(cleaned))
    blocks: list[str] = []
    if starts:
        for index, match in enumerate(starts):
            end = starts[index + 1].start() if index + 1 < len(starts) else len(cleaned)
            blocks.append(cleaned[match.end():end].strip())
    else:
        blocks = _split_unnumbered_blocks(cleaned)

    questions: list[dict[str, Any]] = []
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        content_lines: list[str] = []
        options: list[dict[str, str]] = []
        answer = ""
        explanation: list[str] = []
        knowledge_points: list[str] = []
        section = "content"
        for line in lines:
            line = QUESTION_LABEL.sub("", line, count=1)
            option_match = OPTION_LINE.match(line)
            answer_match = ANSWER_LINE.match(line)
            explanation_match = EXPLANATION_LINE.match(line)
            knowledge_match = KNOWLEDGE_LINE.match(line)
            if option_match:
                section = "options"
                options.append({"label": option_match.group(1), "content": option_match.group(2)})
            elif answer_match:
                section = "answer"
                answer = answer_match.group(1).strip()
            elif explanation_match:
                section = "explanation"
                explanation.append(explanation_match.group(1).strip())
            elif knowledge_match:
                section = "knowledge"
                knowledge_points.extend(
                    item.strip()
                    for item in re.split(r"[,，、]", knowledge_match.group(1))
                    if item.strip()
                )
            elif section == "content":
                content_lines.append(line)
            elif section == "explanation":
                explanation.append(line)

        question_type = default_type
        compact_answer = re.sub(r"[\s,，、]+", "", answer).upper()
        if answer.lower() in {"正确", "错误", "对", "错", "true", "false"}:
            question_type = "judge"
        elif options and len(compact_answer) > 1:
            question_type = "multiple"
        elif not options and question_type in {"single", "multiple"}:
            question_type = "fill"

        if content_lines and answer:
            questions.append(
                _normalise_question(
                    {
                        "content": "\n".join(content_lines),
                        "question_type": question_type,
                        "options": options,
                        "answer": answer,
                        "explanation": "\n".join(explanation) or None,
                        "knowledge_points": knowledge_points,
                        "source_text": block,
                    },
                    default_type,
                )
            )
    return questions


def _normalise_answer(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def evaluate_objective_answer(question_type: str, correct: str, submitted: str) -> bool:
    if question_type == "multiple":
        split_pattern = r"[\s,，、;；]+"
        correct_set = {item.upper() for item in re.split(split_pattern, correct.strip()) if item}
        submitted_set = {item.upper() for item in re.split(split_pattern, submitted.strip()) if item}
        if len(correct_set) == 1 and len(next(iter(correct_set), "")) > 1:
            correct_set = set(next(iter(correct_set)))
        if len(submitted_set) == 1 and len(next(iter(submitted_set), "")) > 1:
            submitted_set = set(next(iter(submitted_set)))
        return correct_set == submitted_set
    if question_type == "judge":
        truthy = {"正确", "对", "true", "1", "yes"}
        return (_normalise_answer(correct) in truthy) == (_normalise_answer(submitted) in truthy)
    return _normalise_answer(correct) == _normalise_answer(submitted)
