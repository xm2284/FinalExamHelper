from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.core import router
from .database import init_db


init_db()

app = FastAPI(
    title="期末不挂科系统",
    description="AI 题库生成与智能刷题平台",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "提交的数据不完整或格式不正确",
                "details": exc.errors(),
            }
        },
    )


@app.get("/")
def root():
    return {"message": "期末不挂科系统 API", "docs": "/docs"}
