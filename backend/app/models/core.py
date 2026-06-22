from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class QuestionBank(Base):
    __tablename__ = "question_banks"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    course_name = Column(String(200), nullable=False)
    description = Column(Text)
    source_type = Column(String(30), default="manual", nullable=False)
    status = Column(String(30), default="draft", nullable=False)
    original_filename = Column(String(500))
    question_count = Column(Integer, default=0, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_practice_at = Column(DateTime(timezone=True))

    questions = relationship("Question", back_populates="bank", cascade="all, delete-orphan")
    sessions = relationship("PracticeSession", back_populates="bank", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    bank_id = Column(Integer, ForeignKey("question_banks.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False)
    options_json = Column(Text, default="[]", nullable=False)
    answer = Column(Text, nullable=False)
    explanation = Column(Text)
    difficulty = Column(Integer, default=1, nullable=False)
    knowledge_points_json = Column(Text, default="[]", nullable=False)
    source_text = Column(Text)
    review_status = Column(String(20), default="draft", nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    bank = relationship("QuestionBank", back_populates="questions")


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True)
    bank_id = Column(Integer, ForeignKey("question_banks.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String(20), nullable=False)
    question_order_json = Column(Text, default="[]", nullable=False)
    current_index = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="active", nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))

    bank = relationship("QuestionBank", back_populates="sessions")
    answers = relationship("AnswerRecord", cascade="all, delete-orphan")


class AnswerRecord(Base):
    __tablename__ = "answer_records"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False)
    bank_id = Column(Integer, ForeignKey("question_banks.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(Text, default="")
    is_correct = Column(Boolean)
    grading_status = Column(String(30), default="graded", nullable=False)
    ai_feedback = Column(Text)
    time_spent_seconds = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WrongQuestion(Base):
    __tablename__ = "wrong_questions"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    bank_id = Column(Integer, ForeignKey("question_banks.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(Text)
    error_count = Column(Integer, default=1, nullable=False)
    last_error_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    task_type = Column(String(30), nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    stage = Column(String(50), default="queued", nullable=False)
    progress = Column(Float, default=0, nullable=False)
    message = Column(Text)
    error_message = Column(Text)
    result_json = Column(Text)
    bank_id = Column(Integer, ForeignKey("question_banks.id", ondelete="SET NULL"))
    retry_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AISettings(Base):
    __tablename__ = "ai_settings"

    id = Column(Integer, primary_key=True)
    api_base_url = Column(String(500), default="https://api.openai.com/v1", nullable=False)
    api_key = Column(String(500))
    model_name = Column(String(100), default="gpt-4o-mini", nullable=False)
    temperature = Column(Float, default=0.3, nullable=False)
    max_questions_per_batch = Column(Integer, default=10, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
