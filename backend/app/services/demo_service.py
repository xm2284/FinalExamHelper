import json
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from ..models import AnswerRecord, PracticeSession, Question, QuestionBank, WrongQuestion


DEMO_BANKS = [
    {
        "name": "高等数学期末冲刺",
        "course_name": "高等数学",
        "description": "微积分、导数与定积分核心题型。",
        "questions": [
            {
                "content": "函数 f(x)=x² 在 x=2 处的导数值是多少？",
                "question_type": "single",
                "options": [
                    {"label": "A", "content": "2"},
                    {"label": "B", "content": "4"},
                    {"label": "C", "content": "6"},
                    {"label": "D", "content": "8"},
                ],
                "answer": "B",
                "explanation": "f'(x)=2x，因此 f'(2)=4。",
                "difficulty": 1,
                "knowledge_points": ["导数", "幂函数"],
            },
            {
                "content": "定积分可以理解为函数图像与坐标轴围成区域的有向面积。",
                "question_type": "judge",
                "options": [],
                "answer": "正确",
                "explanation": "定积分具有有向面积的几何意义。",
                "difficulty": 1,
                "knowledge_points": ["定积分"],
            },
            {
                "content": "请写出函数 sin(x) 的导函数。",
                "question_type": "fill",
                "options": [],
                "answer": "cos(x)",
                "explanation": "基本导数公式：(sin x)'=cos x。",
                "difficulty": 2,
                "knowledge_points": ["三角函数", "导数"],
            },
        ],
    },
    {
        "name": "数据结构重点复习",
        "course_name": "数据结构",
        "description": "线性表、树、图与常见算法。",
        "questions": [
            {
                "content": "下列数据结构中，符合先进先出原则的是？",
                "question_type": "single",
                "options": [
                    {"label": "A", "content": "栈"},
                    {"label": "B", "content": "队列"},
                    {"label": "C", "content": "二叉树"},
                    {"label": "D", "content": "图"},
                ],
                "answer": "B",
                "explanation": "队列遵循 FIFO，栈遵循 LIFO。",
                "difficulty": 1,
                "knowledge_points": ["队列", "线性结构"],
            },
            {
                "content": "二叉搜索树的中序遍历结果是有序序列。",
                "question_type": "judge",
                "options": [],
                "answer": "正确",
                "explanation": "左子树、根、右子树的遍历顺序会产生递增序列。",
                "difficulty": 2,
                "knowledge_points": ["二叉搜索树", "树遍历"],
            },
        ],
    },
]


def load_demo_data(db: Session) -> int:
    existing = db.query(QuestionBank).filter(QuestionBank.is_demo.is_(True)).count()
    if existing:
        return existing

    created_banks: list[QuestionBank] = []
    for bank_data in DEMO_BANKS:
        bank = QuestionBank(
            name=bank_data["name"],
            course_name=bank_data["course_name"],
            description=bank_data["description"],
            source_type="demo",
            status="published",
            is_demo=True,
        )
        db.add(bank)
        db.flush()
        for item in bank_data["questions"]:
            db.add(
                Question(
                    bank_id=bank.id,
                    content=item["content"],
                    question_type=item["question_type"],
                    options_json=json.dumps(item["options"], ensure_ascii=False),
                    answer=item["answer"],
                    explanation=item["explanation"],
                    difficulty=item["difficulty"],
                    knowledge_points_json=json.dumps(item["knowledge_points"], ensure_ascii=False),
                    review_status="published",
                )
            )
        bank.question_count = len(bank_data["questions"])
        created_banks.append(bank)
    db.commit()

    first_bank = created_banks[0]
    questions = db.query(Question).filter(Question.bank_id == first_bank.id).all()
    session = PracticeSession(
        bank_id=first_bank.id,
        mode="sequential",
        question_order_json=json.dumps([question.id for question in questions]),
        current_index=1,
        status="active",
        started_at=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(session)
    db.flush()
    db.add(
        AnswerRecord(
            session_id=session.id,
            bank_id=first_bank.id,
            question_id=questions[0].id,
            user_answer="A",
            is_correct=False,
            grading_status="graded",
            time_spent_seconds=38,
            created_at=datetime.now(UTC) - timedelta(days=1),
        )
    )
    db.add(
        WrongQuestion(
            question_id=questions[0].id,
            bank_id=first_bank.id,
            user_answer="A",
            error_count=2,
        )
    )
    first_bank.last_practice_at = datetime.now(UTC) - timedelta(days=1)
    db.commit()
    return len(created_banks)


def clear_demo_data(db: Session) -> int:
    banks = db.query(QuestionBank).filter(QuestionBank.is_demo.is_(True)).all()
    count = len(banks)
    for bank in banks:
        db.delete(bank)
    db.commit()
    return count
