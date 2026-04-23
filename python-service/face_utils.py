"""
Face recognition using OpenCV only — no mediapipe, no dlib, no compilation.

Strategy:
  - Detect face using OpenCV Haar cascade (built into opencv, zero extra deps)
  - Crop face region, resize to 64x64 grayscale
  - Apply histogram equalisation (lighting normalisation)
  - L2-normalise the pixel vector as the face embedding
  - Compare embeddings using cosine similarity
"""

import base64
import os

import cv2
import numpy as np
from bson import ObjectId
from pymongo import MongoClient

# ---------------------------------------------------------------------------
# DB connection
# ---------------------------------------------------------------------------
MONGO_URI = os.environ.get("MONGO_URI")
_db_client = MongoClient(MONGO_URI)
_db = _db_client["attendance_db"]
_students = _db["students"]

# ---------------------------------------------------------------------------
# OpenCV Haar cascade face detector (built-in, zero extra packages)
# ---------------------------------------------------------------------------
_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_face_cascade = cv2.CascadeClassifier(_cascade_path)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _decode_frame(base64_frame: str) -> np.ndarray:
    """Decode a base64 image string into a BGR numpy array."""
    if "," in base64_frame:
        base64_frame = base64_frame.split(",")[1]
    raw = base64.b64decode(base64_frame)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return cv2.resize(img, (640, 480))


def _extract_embedding(base64_frame: str):
    """
    Returns (embedding_list, error_string).
    embedding_list is a list of 4096 floats (64x64 normalised pixels).
    error_string is None on success.
    """
    img = _decode_frame(base64_frame)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    faces = _face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
    )

    if len(faces) == 0:
        return None, "No face detected - please centre your face and try again"

    if len(faces) > 1:
        return None, "Multiple faces detected - only one person should be visible"

    x, y, w, h = faces[0]

    # Add 20% margin
    margin = int(0.20 * max(w, h))
    x1 = max(0, x - margin)
    y1 = max(0, y - margin)
    x2 = min(img.shape[1], x + w + margin)
    y2 = min(img.shape[0], y + h + margin)

    face_crop = gray[y1:y2, x1:x2]
    if face_crop.size == 0:
        return None, "Could not extract face region"

    # Resize + histogram equalisation (lighting normalisation)
    face_resized = cv2.resize(face_crop, (64, 64))
    face_eq = cv2.equalizeHist(face_resized)

    # L2-normalised flat vector
    vec = face_eq.flatten().astype(np.float64)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm

    return vec.tolist(), None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def register_face(base64_frame: str, student_id: str) -> dict:
    """Extract face embedding and save it to the student's MongoDB document."""
    embedding, error = _extract_embedding(base64_frame)
    if error:
        return {"success": False, "message": error}

    result = _students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {"face_embedding": embedding, "face_registered": True}},
    )

    if result.matched_count == 0:
        return {"success": False, "message": "Student not found"}

    return {"success": True, "message": "Face registered successfully"}


def verify_face(base64_frame: str, class_name: str) -> dict:
    """
    Compare the live face against every registered student in class_name.
    Returns matched=True with student_id when cosine similarity >= 0.88
    (distance = 1 - similarity <= 0.12, well inside the server-side 0.5 guard).
    """
    live_embedding, error = _extract_embedding(base64_frame)
    if error:
        return {"matched": False, "message": error}

    students = list(
        _students.find(
            {"class": class_name, "face_registered": True},
            {"face_embedding": 1, "_id": 1},
        )
    )

    if not students:
        return {"matched": False, "message": "No registered students found in this class"}

    live_vec = np.array(live_embedding)
    best_match = None
    best_similarity = -1.0

    for student in students:
        stored = student.get("face_embedding")
        if not stored:
            continue
        stored_vec = np.array(stored)
        if stored_vec.shape != live_vec.shape:
            continue

        # Both L2-normalised, so dot product == cosine similarity
        similarity = float(np.dot(live_vec, stored_vec))
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = student

    THRESHOLD = 0.88

    if best_match and best_similarity >= THRESHOLD:
        return {
            "matched": True,
            "student_id": str(best_match["_id"]),
            "distance": round(1.0 - best_similarity, 4),
        }

    return {
        "matched": False,
        "message": f"Face did not match (best similarity: {best_similarity:.3f})",
    }
