"""
Face recognition using MediaPipe (face detection) + OpenCV.
No dlib, no compilation required — works on any free-tier platform.

Strategy:
  - Detect face region using MediaPipe FaceDetection
  - Crop, resize to 64x64, convert to grayscale
  - Apply histogram equalization (normalises lighting)
  - L2-normalise the pixel vector as the face embedding
  - Compare embeddings using cosine similarity
"""

import base64
import os

import cv2
import mediapipe as mp
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
# MediaPipe face detector (loaded once)
# ---------------------------------------------------------------------------
_mp_detection = mp.solutions.face_detection
_detector = _mp_detection.FaceDetection(model_selection=0, min_detection_confidence=0.6)

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
    embedding_list is a Python list of 4096 floats (64x64 normalised pixels).
    error_string is None on success.
    """
    img = _decode_frame(base64_frame)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]

    results = _detector.process(rgb)

    if not results.detections:
        return None, "No face detected - please centre your face and try again"

    if len(results.detections) > 1:
        return None, "Multiple faces detected - only one person should be visible"

    det = results.detections[0]
    bb = det.location_data.relative_bounding_box

    # Convert relative bbox to pixel coords
    x = max(0, int(bb.xmin * w))
    y = max(0, int(bb.ymin * h))
    bw = int(bb.width * w)
    bh = int(bb.height * h)

    # Add 20% margin for forehead / chin
    margin = int(0.20 * max(bw, bh))
    x1 = max(0, x - margin)
    y1 = max(0, y - margin)
    x2 = min(w, x + bw + margin)
    y2 = min(h, y + bh + margin)

    face = img[y1:y2, x1:x2]
    if face.size == 0:
        return None, "Could not extract face region"

    # Grayscale + histogram equalisation (lighting normalisation)
    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (64, 64))
    equalised = cv2.equalizeHist(resized)

    # L2-normalised flat vector
    vec = equalised.flatten().astype(np.float64)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm

    return vec.tolist(), None


# ---------------------------------------------------------------------------
# Public API (called from main.py)
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
    Returns matched=True with the student_id when cosine similarity >= 0.88
    (equivalent to distance <= 0.12, well inside the server-side 0.5 guard).
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

        # Both vectors are L2-normalised so dot product == cosine similarity
        similarity = float(np.dot(live_vec, stored_vec))
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = student

    THRESHOLD = 0.88  # cosine similarity; equivalent distance = 1 - 0.88 = 0.12

    if best_match and best_similarity >= THRESHOLD:
        return {
            "matched": True,
            "student_id": str(best_match["_id"]),
            # distance kept < 0.5 so the Node.js guard passes
            "distance": round(1.0 - best_similarity, 4),
        }

    return {
        "matched": False,
        "message": f"Face did not match any student (best similarity: {best_similarity:.3f})",
    }
