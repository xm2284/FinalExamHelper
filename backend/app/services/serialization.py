import json
from datetime import datetime
from typing import Any

from ..models import PracticeSession, Question, QuestionBank, Task


def json_list(value: str | None) -> list[Any]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def question_dict(question: Question, include_answer: bool = True) -> dict[str, Any]:
    result = {
        "id": question.id,
        "bank_id": question.bank_id,
        "content": question.content,
        "question_type": question.question_type,
        "options": json_list(question.options_json),
        "explanation": question.explanation if include_answer else None,
        "difficulty": question.difficulty,
        "knowledge_points": json_list(question.knowledge_points_json),
        "source_text": question.source_text,
        "review_status": question.review_status,
        "is_favorite": question.is_favorite,
        "created_at": question.created_at,
        "updated_at": question.updated_at,
    }
    if include_answer:
        result["answer"] = question.answer
    return result


def bank_dict(bank: QuestionBank) -> dict[str, Any]:
    return {
        "id": bank.id,
        "name": bank.name,
        "course_name": bank.course_name,
        "description": bank.description,
        "source_type": bank.source_type,
        "status": bank.status,
        "original_filename": bank.original_filename,
        "question_count": bank.question_count,
        "is_demo": bank.is_demo,
        "created_at": bank.created_at,
        "updated_at": bank.updated_at,
        "last_practice_at": bank.last_practice_at,
    }


def session_dict(session: PracticeSession) -> dict[str, Any]:
    order = json_list(session.question_order_json)
    return {
        "id": session.id,
        "bank_id": session.bank_id,
        "bank_name": session.bank.name if session.bank else None,
        "mode": session.mode,
        "question_order": order,
        "question_count": len(order),
        "current_index": session.current_index,
        "status": session.status,
        "started_at": session.started_at,
        "updated_at": session.updated_at,
        "completed_at": session.completed_at,
    }


def task_dict(task: Task) -> dict[str, Any]:
    return {
        "id": task.id,
        "task_type": task.task_type,
        "status": task.status,
        "stage": task.stage,
        "progress": task.progress,
        "message": task.message,
        "error_message": task.error_message,
        "bank_id": task.bank_id,
        "retry_count": task.retry_count,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


def iso_date(value: datetime | None) -> str | None:
    return value.isoformat() if value else None
