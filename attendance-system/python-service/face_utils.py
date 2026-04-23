import base64
import os
from pathlib import Path

import cv2
import face_recognition
import numpy as np
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import ConfigurationError


def load_env_file():
    env_path = Path(__file__).resolve().parent / ".env"

    if not env_path.exists():
        return

    for line in env_path.read_text().splitlines():
        stripped = line.strip()

        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is missing in python-service/.env")

client = MongoClient(MONGO_URI)

try:
    db = client.get_default_database()
except ConfigurationError:
    db = client["attendance_db"]

students_collection = db["students"]


def _decode_frame(base64_frame: str):
    try:
        if "," in base64_frame:
            base64_frame = base64_frame.split(",", 1)[1]

        frame_bytes = base64.b64decode(base64_frame)
        np_buffer = np.frombuffer(frame_bytes, dtype=np.uint8)
        image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

        if image is None:
            return None, "Invalid image frame"

        resized = cv2.resize(image, (640, 480))
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        return rgb, None
    except Exception:
        return None, "Could not decode image frame"


def _face_location_from_frame(rgb_image):
    locations = face_recognition.face_locations(rgb_image, number_of_times_to_upsample=1, model="hog")

    if not locations:
        return None, "No face detected"

    if len(locations) > 1:
        return None, "Multiple faces detected"

    top, right, bottom, left = locations[0]

    if right <= left or bottom <= top:
        return None, "Face detection was too small"

    return (top, right, bottom, left), None


def _encode_single_face(base64_frame: str):
    rgb, error = _decode_frame(base64_frame)

    if error:
        return None, error

    location, error = _face_location_from_frame(rgb)

    if error:
        return None, error

    encodings = face_recognition.face_encodings(rgb, known_face_locations=[location], num_jitters=1)

    if not encodings:
        return None, "Face encoding failed. Please face the camera clearly"

    if len(encodings[0]) != 128:
        return None, "Invalid face embedding generated"

    return encodings[0], None


def register_face(base64_frame: str, student_id: str) -> dict:
    try:
        encoding, error = _encode_single_face(base64_frame)

        if error:
            return {"success": False, "message": error}

        result = students_collection.update_one(
            {"_id": ObjectId(student_id)},
            {
                "$set": {
                    "face_embedding": encoding.tolist(),
                    "face_registered": True
                }
            }
        )

        if result.matched_count == 0:
            return {"success": False, "message": "Student not found"}

        return {"success": True, "message": "Face registered successfully"}
    except Exception as exc:
        return {"success": False, "message": str(exc)}


def verify_face(base64_frame: str, class_name: str) -> dict:
    try:
        live_encoding, error = _encode_single_face(base64_frame)

        if error:
            return {"matched": False, "message": error}

        students = list(
            students_collection.find(
                {
                    "class": class_name,
                    "face_registered": True,
                    "face_embedding": {"$exists": True, "$type": "array"}
                },
                {"face_embedding": 1}
            )
        )

        if not students:
            return {"matched": False, "message": "No registered faces found for this class"}

        best_student_id = None
        best_distance = None

        for student in students:
            stored_embedding = np.array(student.get("face_embedding", []), dtype=np.float64)

            if stored_embedding.shape[0] != 128:
                continue

            distance = float(face_recognition.face_distance([stored_embedding], live_encoding)[0])

            if best_distance is None or distance < best_distance:
                best_distance = distance
                best_student_id = str(student["_id"])

        if best_student_id is None:
            return {"matched": False, "message": "No valid face embeddings found"}

        if best_distance < 0.5:
            return {
                "matched": True,
                "student_id": best_student_id,
                "distance": best_distance
            }

        return {
            "matched": False,
            "distance": best_distance,
            "message": "Face did not match registered students"
        }
    except Exception as exc:
        return {"matched": False, "message": str(exc)}
