import base64
import io
import json
import re
from datetime import datetime
from pathlib import Path

from PIL import Image

try:
    import face_recognition
    import numpy as np

    FACE_LIBS_AVAILABLE = True
except ImportError:
    FACE_LIBS_AVAILABLE = False


class FaceCaptureError(Exception):
    pass


def decode_image_data(image_data: str) -> bytes:
    if not image_data:
        raise FaceCaptureError("Image data is required.")

    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    try:
        return base64.b64decode(image_data, validate=True)
    except Exception as exc:
        raise FaceCaptureError("Invalid image data.") from exc


def extract_face_encoding(image_bytes: bytes) -> list[float] | None:
    if not FACE_LIBS_AVAILABLE:
        return None

    try:
        image = face_recognition.load_image_file(io.BytesIO(image_bytes))
    except Exception as exc:
        raise FaceCaptureError("Could not read image file.") from exc

    locations = face_recognition.face_locations(image)
    if not locations:
        raise FaceCaptureError("No face detected. Please try again with better lighting.")
    if len(locations) > 1:
        raise FaceCaptureError("Multiple faces detected. Only one student should be in the frame.")

    encodings = face_recognition.face_encodings(image, locations)
    if not encodings:
        raise FaceCaptureError("Could not extract facial features from the image.")

    return encodings[0].tolist()


def save_student_face(student, image_bytes: bytes, upload_root: str) -> tuple[Path, list[float] | None]:
    encoding = extract_face_encoding(image_bytes)

    student_dir = Path(upload_root) / student.student_id
    student_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{timestamp}.jpg"
    file_path = student_dir / filename

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image.save(file_path, format="JPEG", quality=90)

    return file_path, encoding
