from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class QuestionOption(BaseModel):
    label: str
    content: str


class QuestionPayload(BaseModel):
    content: str = Field(min_length=1)
    question_type: Literal["single", "multiple", "judge", "fill", "essay"]
    options: list[QuestionOption] = []
    answer: str = Field(min_length=1)
    explanation: str | None = None
    difficulty: int = Field(default=1, ge=1, le=5)
    knowledge_points: list[str] = []
    source_text: str | None = None
    review_status: Literal["draft", "approved", "published"] = "draft"


class QuestionUpdate(BaseModel):
    content: str | None = None
    question_type: str | None = None
    options: list[QuestionOption] | None = None
    answer: str | None = None
    explanation: str | None = None
    difficulty: int | None = Field(default=None, ge=1, le=5)
    knowledge_points: list[str] | None = None
    review_status: str | None = None
    is_favorite: bool | None = None


class BankPayload(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    course_name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class PracticeSessionCreate(BaseModel):
    bank_id: int
    mode: Literal["sequential", "random", "wrong", "favorite"] = "sequential"


class PracticeProgress(BaseModel):
    current_index: int = Field(ge=0)
    status: Literal["active", "completed"] | None = None


class AnswerSubmit(BaseModel):
    question_id: int
    user_answer: str
    time_spent_seconds: int = Field(default=0, ge=0)


class AISettingsUpdate(BaseModel):
    api_base_url: str | None = None
    api_key: str | None = None
    model_name: str | None = None
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_questions_per_batch: int | None = Field(default=None, ge=1, le=20)
    is_enabled: bool | None = None


class ImportTextPayload(BaseModel):
    bank_name: str = ""
    course_name: str
    text: str
    default_type: str = "single"
    import_mode: Literal["questions", "material"] = "questions"
    question_count: int = Field(default=10, ge=1, le=20)


class MessageResponse(BaseModel):
    message: str
    data: dict[str, Any] | None = None


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
