from pydantic import BaseModel
from fastapi import FastAPI

from face_utils import register_face, verify_face

app = FastAPI(title="Attendance Face Service")


class RegisterRequest(BaseModel):
    base64_frame: str
    student_id: str


class VerifyRequest(BaseModel):
    base64_frame: str
    class_name: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/register")
def register(payload: RegisterRequest):
    return register_face(payload.base64_frame, payload.student_id)


@app.post("/verify")
def verify(payload: VerifyRequest):
    return verify_face(payload.base64_frame, payload.class_name)
