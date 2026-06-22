import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable

from ..database import SessionLocal
from ..models import Question, QuestionBank, Task
from .import_service import parse_with_optional_ai


executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="exam-helper")


def submit_task(task_id: int, handler: Callable[[], list[dict]]) -> None:
    executor.submit(_run_task, task_id, handler)


def _run_task(task_id: int, handler: Callable[[], list[dict]]) -> None:
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if not task:
            return
        task.status = "processing"
        task.stage = "parsing"
        task.progress = 0.2
        db.commit()

        questions = handler()
        if not questions:
            raise ValueError("没有识别到有效题目，请检查题号、答案和文件格式。")

        task.stage = "saving"
        task.progress = 0.75
        db.commit()
        bank = db.get(QuestionBank, task.bank_id)
        for item in questions:
            db.add(
                Question(
                    bank_id=bank.id,
                    content=item["content"],
                    question_type=item["question_type"],
                    options_json=json.dumps(item.get("options") or [], ensure_ascii=False),
                    answer=item["answer"],
                    explanation=item.get("explanation"),
                    difficulty=item.get("difficulty", 1),
                    knowledge_points_json=json.dumps(
                        item.get("knowledge_points") or [], ensure_ascii=False
                    ),
                    source_text=item.get("source_text"),
                    review_status="draft",
                )
            )
        bank.question_count = len(questions)
        bank.status = "review"
        task.status = "completed"
        task.stage = "completed"
        task.progress = 1
        task.message = f"已生成 {len(questions)} 道待审核题目"
        task.result_json = json.dumps({"question_count": len(questions)})
        db.commit()
    except Exception as exc:
        task = db.get(Task, task_id)
        if task:
            task.status = "failed"
            task.stage = "failed"
            task.error_message = str(exc)
            bank = db.get(QuestionBank, task.bank_id) if task.bank_id else None
            if bank:
                bank.status = "failed"
            db.commit()
    finally:
        db.close()


def text_handler(text: str, default_type: str) -> Callable[[], list[dict]]:
    def handler() -> list[dict]:
        from .ai_service import normalize_question_text

        def ai_fallback(source: str, question_type: str) -> list[dict]:
            db = SessionLocal()
            try:
                return normalize_question_text(db, source, question_type)
            finally:
                db.close()

        return parse_with_optional_ai(text, default_type, ai_fallback)

    return handler


def read_file_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md", ".csv", ".json"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".docx":
        from docx import Document

        return "\n".join(paragraph.text for paragraph in Document(path).paragraphs)
    if suffix == ".pdf":
        import pymupdf

        document = pymupdf.open(path)
        pages = [page.get_text() for page in document]
        document.close()
        text = "\n".join(pages).strip()
        if len(text) < 50:
            raise ValueError(
                "检测到该 PDF 可能是扫描版，当前版本暂未安装 OCR，请上传可复制文字的 PDF。"
            )
        return text
    raise ValueError(f"暂不支持 {suffix or '未知'} 文件格式")


def file_handler(path: Path, default_type: str) -> Callable[[], list[dict]]:
    def handler() -> list[dict]:
        text = read_file_text(path)
        return text_handler(text, default_type)()

    return handler
