import json
import uuid
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    AISettings,
    AnswerRecord,
    PracticeSession,
    Question,
    QuestionBank,
    Task,
    WrongQuestion,
)
from ..schemas.core import (
    AISettingsUpdate,
    AnswerSubmit,
    BankPayload,
    ImportTextPayload,
    PracticeProgress,
    PracticeSessionCreate,
    QuestionPayload,
    QuestionUpdate,
)
from ..services.ai_service import (
    analyze_wrong_answer,
    explain_question,
    generate_questions,
    get_settings,
    grade_subjective,
    stream_question_explanation,
)
from ..services.demo_service import clear_demo_data, load_demo_data
from ..services.import_service import derive_bank_name
from ..services.practice_service import build_question_order, clamp_progress
from ..services.question_parser import evaluate_objective_answer
from ..services.serialization import bank_dict, json_list, question_dict, session_dict, task_dict
from ..services.task_runner import file_handler, read_file_text, submit_task, text_handler


router = APIRouter(prefix="/api")
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
SUPPORTED_EXTENSIONS = {".txt", ".md", ".docx", ".csv", ".json", ".pdf"}


def get_or_404(db: Session, model, object_id: int, label: str):
    value = db.get(model, object_id)
    if not value:
        raise HTTPException(status_code=404, detail=f"{label}不存在")
    return value


def update_bank_count(db: Session, bank_id: int) -> None:
    bank = db.get(QuestionBank, bank_id)
    if bank:
        bank.question_count = db.query(Question).filter(Question.bank_id == bank_id).count()


@router.get("/meta")
def meta():
    return {
        "name": "期末不挂科",
        "version": "2.0.0",
        "supported_extensions": sorted(ext.lstrip(".") for ext in SUPPORTED_EXTENSIONS),
        "max_question_file_mb": 10,
        "max_material_file_mb": 50,
    }


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    today = date.today()
    today_answers = db.query(AnswerRecord).filter(
        func.date(AnswerRecord.created_at) == today
    ).all()
    graded = [answer for answer in today_answers if answer.is_correct is not None]
    total_banks = db.query(QuestionBank).filter(QuestionBank.status == "published").count()
    wrong_count = db.query(WrongQuestion).count()
    favorite_count = db.query(Question).filter(Question.is_favorite.is_(True)).count()
    active_session = (
        db.query(PracticeSession)
        .filter(PracticeSession.status == "active")
        .order_by(PracticeSession.updated_at.desc())
        .first()
    )
    recent_banks = (
        db.query(QuestionBank).order_by(QuestionBank.updated_at.desc()).limit(5).all()
    )
    active_tasks = (
        db.query(Task)
        .filter(Task.status.in_(["pending", "processing"]))
        .order_by(Task.created_at.desc())
        .limit(4)
        .all()
    )

    trend = []
    for days_ago in range(6, -1, -1):
        day = today - timedelta(days=days_ago)
        answers = db.query(AnswerRecord).filter(func.date(AnswerRecord.created_at) == day).all()
        correct = sum(1 for item in answers if item.is_correct)
        trend.append(
            {
                "date": day.strftime("%m-%d"),
                "count": len(answers),
                "correct_rate": round(correct / len(answers) * 100, 1) if answers else 0,
            }
        )

    weak_map: dict[str, dict[str, int]] = {}
    wrongs = db.query(WrongQuestion).all()
    for wrong in wrongs:
        question = db.get(Question, wrong.question_id)
        if not question:
            continue
        for point in json_list(question.knowledge_points_json) or ["未分类"]:
            stats = weak_map.setdefault(point, {"errors": 0, "questions": 0})
            stats["errors"] += wrong.error_count
            stats["questions"] += 1
    weak_points = sorted(
        [{"name": name, **stats} for name, stats in weak_map.items()],
        key=lambda item: item["errors"],
        reverse=True,
    )[:5]

    return {
        "stats": {
            "today_count": len(today_answers),
            "today_correct": sum(1 for item in graded if item.is_correct),
            "today_correct_rate": round(
                sum(1 for item in graded if item.is_correct) / len(graded) * 100, 1
            ) if graded else 0,
            "total_banks": total_banks,
            "wrong_count": wrong_count,
            "favorite_count": favorite_count,
        },
        "active_session": session_dict(active_session) if active_session else None,
        "recent_banks": [bank_dict(bank) for bank in recent_banks],
        "active_tasks": [task_dict(task) for task in active_tasks],
        "trend": trend,
        "weak_points": weak_points,
    }


@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    answers = db.query(AnswerRecord).all()
    course_map: dict[str, dict[str, int]] = {}
    type_map: dict[str, dict[str, int]] = {}
    knowledge_map: dict[str, dict[str, int]] = {}
    total_seconds = 0
    for answer in answers:
        question = db.get(Question, answer.question_id)
        bank = db.get(QuestionBank, answer.bank_id)
        if not question or not bank:
            continue
        total_seconds += answer.time_spent_seconds
        for target, key in ((course_map, bank.course_name), (type_map, question.question_type)):
            stats = target.setdefault(key, {"total": 0, "correct": 0})
            stats["total"] += 1
            stats["correct"] += int(bool(answer.is_correct))
        for point in json_list(question.knowledge_points_json) or ["未分类"]:
            stats = knowledge_map.setdefault(point, {"total": 0, "correct": 0})
            stats["total"] += 1
            stats["correct"] += int(bool(answer.is_correct))

    def rows(source):
        return [
            {
                "name": name,
                **stats,
                "correct_rate": round(stats["correct"] / stats["total"] * 100, 1)
                if stats["total"]
                else 0,
            }
            for name, stats in source.items()
        ]

    return {
        "summary": {
            "total_answers": len(answers),
            "total_minutes": round(total_seconds / 60),
            "correct_rate": round(
                sum(1 for answer in answers if answer.is_correct) / len(answers) * 100, 1
            ) if answers else 0,
            "active_days": len({answer.created_at.date() for answer in answers}),
        },
        "courses": rows(course_map),
        "question_types": rows(type_map),
        "knowledge_points": sorted(rows(knowledge_map), key=lambda item: item["correct_rate"]),
        "trend": dashboard(db)["trend"],
    }


@router.get("/banks")
def list_banks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    course: str | None = None,
    source: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(QuestionBank)
    if search:
        query = query.filter(QuestionBank.name.contains(search))
    if course:
        query = query.filter(QuestionBank.course_name == course)
    if source:
        query = query.filter(QuestionBank.source_type == source)
    if status:
        query = query.filter(QuestionBank.status == status)
    total = query.count()
    items = (
        query.order_by(QuestionBank.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": [bank_dict(bank) for bank in items], "total": total, "page": page, "page_size": page_size}


@router.post("/banks")
def create_bank(payload: BankPayload, db: Session = Depends(get_db)):
    bank = QuestionBank(**payload.model_dump(), status="draft", source_type="manual")
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank_dict(bank)


@router.get("/banks/courses")
def list_courses(db: Session = Depends(get_db)):
    return [row[0] for row in db.query(QuestionBank.course_name).distinct().all()]


@router.get("/banks/{bank_id}")
def get_bank(bank_id: int, db: Session = Depends(get_db)):
    return bank_dict(get_or_404(db, QuestionBank, bank_id, "题库"))


@router.put("/banks/{bank_id}")
def update_bank(bank_id: int, payload: BankPayload, db: Session = Depends(get_db)):
    bank = get_or_404(db, QuestionBank, bank_id, "题库")
    for key, value in payload.model_dump().items():
        setattr(bank, key, value)
    db.commit()
    return bank_dict(bank)


@router.delete("/banks/{bank_id}")
def delete_bank(bank_id: int, db: Session = Depends(get_db)):
    bank = get_or_404(db, QuestionBank, bank_id, "题库")
    db.delete(bank)
    db.commit()
    return {"message": "题库已删除"}


@router.post("/banks/{bank_id}/publish")
def publish_bank(bank_id: int, db: Session = Depends(get_db)):
    bank = get_or_404(db, QuestionBank, bank_id, "题库")
    questions = db.query(Question).filter(Question.bank_id == bank_id).all()
    if not questions:
        raise HTTPException(status_code=400, detail="题库中没有可发布的题目")
    for question in questions:
        question.review_status = "published"
    bank.status = "published"
    bank.question_count = len(questions)
    db.commit()
    return bank_dict(bank)


@router.post("/banks/{bank_id}/questions/approve")
def approve_questions(
    bank_id: int,
    question_ids: list[int] | None = None,
    db: Session = Depends(get_db),
):
    get_or_404(db, QuestionBank, bank_id, "题库")
    query = db.query(Question).filter(Question.bank_id == bank_id)
    if question_ids:
        query = query.filter(Question.id.in_(question_ids))
    questions = query.all()
    for question in questions:
        question.review_status = "approved"
    db.commit()
    return {"approved": len(questions)}


@router.get("/banks/{bank_id}/export")
def export_bank(bank_id: int, db: Session = Depends(get_db)):
    bank = get_or_404(db, QuestionBank, bank_id, "题库")
    questions = db.query(Question).filter(Question.bank_id == bank_id).all()
    return JSONResponse(
        content={
            "bank": {"name": bank.name, "course_name": bank.course_name},
            "questions": [question_dict(question) for question in questions],
        },
        headers={"Content-Disposition": f'attachment; filename="bank-{bank_id}.json"'},
    )


@router.get("/banks/{bank_id}/questions")
def list_questions(
    bank_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    question_type: str | None = None,
    difficulty: int | None = None,
    knowledge_point: str | None = None,
    search: str | None = None,
    review_status: str | None = None,
    db: Session = Depends(get_db),
):
    get_or_404(db, QuestionBank, bank_id, "题库")
    query = db.query(Question).filter(Question.bank_id == bank_id)
    if question_type:
        query = query.filter(Question.question_type == question_type)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if search:
        query = query.filter(Question.content.contains(search))
    if review_status:
        query = query.filter(Question.review_status == review_status)
    total = query.count()
    items = (
        query.order_by(Question.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    if knowledge_point:
        items = [item for item in items if knowledge_point in json_list(item.knowledge_points_json)]
        total = len(items)
    return {
        "items": [question_dict(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/banks/{bank_id}/questions")
def create_question(bank_id: int, payload: QuestionPayload, db: Session = Depends(get_db)):
    get_or_404(db, QuestionBank, bank_id, "题库")
    data = payload.model_dump()
    question = Question(
        bank_id=bank_id,
        content=data["content"],
        question_type=data["question_type"],
        options_json=json.dumps(data["options"], ensure_ascii=False),
        answer=data["answer"],
        explanation=data["explanation"],
        difficulty=data["difficulty"],
        knowledge_points_json=json.dumps(data["knowledge_points"], ensure_ascii=False),
        source_text=data["source_text"],
        review_status=data["review_status"],
    )
    db.add(question)
    db.flush()
    update_bank_count(db, bank_id)
    db.commit()
    return question_dict(question)


@router.put("/questions/{question_id}")
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)):
    question = get_or_404(db, Question, question_id, "题目")
    data = payload.model_dump(exclude_unset=True)
    if "options" in data:
        question.options_json = json.dumps(data.pop("options"), ensure_ascii=False)
    if "knowledge_points" in data:
        question.knowledge_points_json = json.dumps(data.pop("knowledge_points"), ensure_ascii=False)
    for key, value in data.items():
        setattr(question, key, value)
    db.commit()
    return question_dict(question)


@router.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = get_or_404(db, Question, question_id, "题目")
    bank_id = question.bank_id
    db.delete(question)
    db.flush()
    update_bank_count(db, bank_id)
    db.commit()
    return {"message": "题目已删除"}


@router.post("/questions/{question_id}/favorite")
def toggle_favorite(question_id: int, db: Session = Depends(get_db)):
    question = get_or_404(db, Question, question_id, "题目")
    question.is_favorite = not question.is_favorite
    db.commit()
    return {"question_id": question.id, "is_favorite": question.is_favorite}


def _create_import_bank(
    db: Session,
    name: str,
    course: str,
    source: str,
    filename: str | None = None,
    retry_payload: dict | None = None,
):
    bank = QuestionBank(
        name=name,
        course_name=course,
        source_type=source,
        status="parsing",
        original_filename=filename,
    )
    db.add(bank)
    db.flush()
    task = Task(
        task_type="material_generate" if source == "ai" else "file_parse",
        bank_id=bank.id,
        message="任务已进入队列",
        result_json=json.dumps(retry_payload, ensure_ascii=False) if retry_payload else None,
    )
    db.add(task)
    db.commit()
    return bank, task


@router.post("/imports/text")
def import_text(payload: ImportTextPayload, db: Session = Depends(get_db)):
    source = "ai" if payload.import_mode == "material" else "manual"
    bank, task = _create_import_bank(
        db,
        derive_bank_name(payload.bank_name, payload.course_name),
        payload.course_name,
        source,
        retry_payload={"kind": "text", **payload.model_dump()},
    )
    if payload.import_mode == "material":
        def ai_handler():
            ai_db = SessionProxy()
            try:
                return generate_questions(ai_db, payload.text, payload.question_count)
            finally:
                ai_db.close()
        submit_task(task.id, ai_handler)
    else:
        submit_task(task.id, text_handler(payload.text, payload.default_type))
    return {"bank_id": bank.id, "task_id": task.id, "status": "queued"}


class SessionProxy:
    """Create a short-lived DB session for AI callbacks executed in the task runner."""

    def __new__(cls):
        from ..database import SessionLocal

        return SessionLocal()


@router.post("/imports/file")
async def import_file(
    file: UploadFile = File(...),
    bank_name: str = Form(""),
    course_name: str = Form(...),
    default_type: str = Form("single"),
    import_mode: str = Form("questions"),
    db: Session = Depends(get_db),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="不支持该文件格式")
    max_size = 50 * 1024 * 1024 if import_mode == "material" or suffix == ".pdf" else 10 * 1024 * 1024
    target = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    size = 0
    with target.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > max_size:
                output.close()
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="文件超过允许大小")
            output.write(chunk)
    source = "ai" if import_mode == "material" else ("pdf" if suffix == ".pdf" else "file")
    bank, task = _create_import_bank(
        db,
        derive_bank_name(bank_name, course_name, file.filename),
        course_name,
        source,
        file.filename,
        retry_payload={
            "kind": "file",
            "path": str(target),
            "default_type": default_type,
            "import_mode": import_mode,
        },
    )
    if import_mode == "material":
        def material_handler():
            material = read_file_text(target)
            ai_db = SessionProxy()
            try:
                return generate_questions(ai_db, material, 10)
            finally:
                ai_db.close()
        submit_task(task.id, material_handler)
    else:
        submit_task(task.id, file_handler(target, default_type))
    return {"bank_id": bank.id, "task_id": task.id, "status": "queued"}


@router.get("/tasks")
def list_tasks(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    return [task_dict(task) for task in query.order_by(Task.created_at.desc()).all()]


@router.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    return task_dict(get_or_404(db, Task, task_id, "任务"))


@router.post("/tasks/{task_id}/retry")
def retry_task(task_id: int, db: Session = Depends(get_db)):
    task = get_or_404(db, Task, task_id, "任务")
    if task.status != "failed":
        raise HTTPException(status_code=400, detail="只有失败任务可以重试")
    try:
        payload = json.loads(task.result_json or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="任务缺少可重试信息") from exc
    if not payload:
        raise HTTPException(status_code=400, detail="任务缺少可重试信息")
    task.status = "pending"
    task.stage = "queued"
    task.progress = 0
    task.error_message = None
    task.retry_count += 1
    db.commit()

    if payload.get("kind") == "text":
        if payload.get("import_mode") == "material":
            def handler():
                ai_db = SessionProxy()
                try:
                    return generate_questions(
                        ai_db, payload["text"], int(payload.get("question_count", 10))
                    )
                finally:
                    ai_db.close()
            submit_task(task.id, handler)
        else:
            submit_task(task.id, text_handler(payload["text"], payload.get("default_type", "single")))
    elif payload.get("kind") == "file":
        path = Path(payload["path"])
        if not path.exists():
            raise HTTPException(status_code=400, detail="原始文件已不存在，无法重试")
        if payload.get("import_mode") == "material":
            def material_handler():
                material = read_file_text(path)
                ai_db = SessionProxy()
                try:
                    return generate_questions(ai_db, material, 10)
                finally:
                    ai_db.close()
            submit_task(task.id, material_handler)
        else:
            submit_task(task.id, file_handler(path, payload.get("default_type", "single")))
    return task_dict(task)


@router.post("/practice/sessions")
def create_session(payload: PracticeSessionCreate, db: Session = Depends(get_db)):
    bank = get_or_404(db, QuestionBank, payload.bank_id, "题库")
    if bank.status != "published":
        raise HTTPException(status_code=400, detail="题库尚未发布")
    query = db.query(Question).filter(
        Question.bank_id == bank.id, Question.review_status == "published"
    )
    questions = query.all()
    if payload.mode == "favorite":
        questions = [question for question in questions if question.is_favorite]
    elif payload.mode == "wrong":
        wrong_ids = {
            row[0]
            for row in db.query(WrongQuestion.question_id).filter(WrongQuestion.bank_id == bank.id).all()
        }
        questions = [question for question in questions if question.id in wrong_ids]
    if not questions:
        raise HTTPException(status_code=400, detail="当前模式下没有可练习题目")
    order = build_question_order([question.id for question in questions], payload.mode)
    session = PracticeSession(
        bank_id=bank.id,
        mode=payload.mode,
        question_order_json=json.dumps(order),
        current_index=0,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_dict(session)


@router.get("/practice/sessions/active")
def active_session(db: Session = Depends(get_db)):
    session = (
        db.query(PracticeSession)
        .filter(PracticeSession.status == "active")
        .order_by(PracticeSession.updated_at.desc())
        .first()
    )
    return session_dict(session) if session else None


@router.get("/practice/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = get_or_404(db, PracticeSession, session_id, "练习会话")
    result = session_dict(session)
    order = result["question_order"]
    questions = db.query(Question).filter(Question.id.in_(order)).all()
    question_map = {question.id: question for question in questions}
    result["questions"] = [
        question_dict(question_map[question_id], include_answer=False)
        for question_id in order
        if question_id in question_map
    ]
    return result


@router.patch("/practice/sessions/{session_id}")
def save_progress(session_id: int, payload: PracticeProgress, db: Session = Depends(get_db)):
    session = get_or_404(db, PracticeSession, session_id, "练习会话")
    count = len(json_list(session.question_order_json))
    session.current_index = clamp_progress(payload.current_index, count)
    if payload.status:
        session.status = payload.status
        if payload.status == "completed":
            session.completed_at = datetime.now(UTC)
    db.commit()
    return session_dict(session)


@router.post("/practice/sessions/{session_id}/answers")
def submit_answer(
    session_id: int, payload: AnswerSubmit, db: Session = Depends(get_db)
):
    session = get_or_404(db, PracticeSession, session_id, "练习会话")
    question = get_or_404(db, Question, payload.question_id, "题目")
    grading_status = "graded"
    feedback = question.explanation
    is_correct = None
    if question.question_type in {"single", "multiple", "judge", "fill"}:
        is_correct = evaluate_objective_answer(
            question.question_type, question.answer, payload.user_answer
        )
    else:
        try:
            grade = grade_subjective(db, question, payload.user_answer)
            is_correct = grade["is_correct"]
            feedback = grade["feedback"]
        except Exception:
            grading_status = "pending_self_review"

    record = AnswerRecord(
        session_id=session.id,
        bank_id=session.bank_id,
        question_id=question.id,
        user_answer=payload.user_answer,
        is_correct=is_correct,
        grading_status=grading_status,
        ai_feedback=feedback,
        time_spent_seconds=payload.time_spent_seconds,
    )
    db.add(record)
    if is_correct is False:
        wrong = db.query(WrongQuestion).filter(
            WrongQuestion.bank_id == session.bank_id,
            WrongQuestion.question_id == question.id,
        ).first()
        if wrong:
            wrong.error_count += 1
            wrong.user_answer = payload.user_answer
            wrong.last_error_at = datetime.now(UTC)
        else:
            db.add(
                WrongQuestion(
                    bank_id=session.bank_id,
                    question_id=question.id,
                    user_answer=payload.user_answer,
                )
            )
    bank = db.get(QuestionBank, session.bank_id)
    bank.last_practice_at = datetime.now(UTC)
    db.commit()
    return {
        "is_correct": is_correct,
        "grading_status": grading_status,
        "correct_answer": question.answer,
        "explanation": feedback,
    }


@router.get("/wrong-questions")
def wrong_questions(sort_by: str = "last_error_at", db: Session = Depends(get_db)):
    query = db.query(WrongQuestion)
    query = query.order_by(
        WrongQuestion.error_count.desc()
        if sort_by == "error_count"
        else WrongQuestion.last_error_at.desc()
    )
    result = []
    for wrong in query.all():
        question = db.get(Question, wrong.question_id)
        bank = db.get(QuestionBank, wrong.bank_id)
        if question and bank:
            result.append(
                {
                    "id": wrong.id,
                    "question_id": question.id,
                    "bank_id": bank.id,
                    "bank_name": bank.name,
                    "course_name": bank.course_name,
                    "question": question_dict(question),
                    "user_answer": wrong.user_answer,
                    "error_count": wrong.error_count,
                    "last_error_at": wrong.last_error_at,
                }
            )
    return result


@router.delete("/wrong-questions/{wrong_id}")
def remove_wrong(wrong_id: int, db: Session = Depends(get_db)):
    wrong = get_or_404(db, WrongQuestion, wrong_id, "错题")
    db.delete(wrong)
    db.commit()
    return {"message": "已移出错题本"}


@router.post("/ai/explain/{question_id}")
def ai_explain(question_id: int, user_answer: str = "", db: Session = Depends(get_db)):
    question = get_or_404(db, Question, question_id, "题目")
    try:
        return {"explanation": explain_question(db, question, user_answer)}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/ai/explain/{question_id}/stream")
def ai_explain_stream(
    question_id: int,
    user_answer: str = "",
    db: Session = Depends(get_db),
):
    question = get_or_404(db, Question, question_id, "题目")
    settings = get_settings(db)
    if not settings.is_enabled or not settings.api_key:
        raise HTTPException(status_code=400, detail="AI 尚未配置或已关闭")
    return StreamingResponse(
        stream_question_explanation(db, question, user_answer),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ai/analyze-wrong/{wrong_id}")
def ai_analyze_wrong(wrong_id: int, db: Session = Depends(get_db)):
    wrong = get_or_404(db, WrongQuestion, wrong_id, "错题")
    question = get_or_404(db, Question, wrong.question_id, "题目")
    try:
        return {"analysis": analyze_wrong_answer(db, question, wrong.user_answer or "")}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def mask_key(key: str | None) -> str | None:
    if not key:
        return None
    if len(key) < 8:
        return "****"
    return f"{key[:3]}****{key[-4:]}"


@router.get("/ai-settings")
def read_settings(db: Session = Depends(get_db)):
    settings = get_settings(db)
    return {
        "api_base_url": settings.api_base_url,
        "api_key_masked": mask_key(settings.api_key),
        "model_name": settings.model_name,
        "temperature": settings.temperature,
        "max_questions_per_batch": settings.max_questions_per_batch,
        "is_enabled": settings.is_enabled,
        "is_configured": bool(settings.api_key),
    }


@router.put("/ai-settings")
def save_settings(payload: AISettingsUpdate, db: Session = Depends(get_db)):
    settings = get_settings(db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "api_key" and not value:
            continue
        setattr(settings, key, value)
    db.commit()
    return read_settings(db)


@router.post("/ai-settings/test")
def test_settings(db: Session = Depends(get_db)):
    settings = get_settings(db)
    if not settings.api_key:
        raise HTTPException(status_code=400, detail="请先保存 API Key")
    try:
        response = httpx.get(
            f"{settings.api_base_url.rstrip('/')}/models",
            headers={"Authorization": f"Bearer {settings.api_key}"},
            timeout=10,
        )
        if response.is_success:
            return {"status": "connected", "message": "连接成功"}
        raise HTTPException(status_code=400, detail=f"服务返回 {response.status_code}")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"连接失败：{exc}") from exc


@router.post("/demo/load")
def load_demo(db: Session = Depends(get_db)):
    count = load_demo_data(db)
    return {"message": "演示数据已载入", "bank_count": count}


@router.delete("/demo")
def clear_demo(db: Session = Depends(get_db)):
    count = clear_demo_data(db)
    return {"message": "演示数据已清空", "bank_count": count}
