import os
from pathlib import Path

IMAGE_FILENAME = "67512.jpg"
BASE_DIR = Path(__file__).resolve().parent.parent  # api/ 상위(프로젝트 루트)
IMAGE_PATH = BASE_DIR / "public" / "stores" / IMAGE_FILENAME
USER_ID = "p01"
TASK_DESCRIPTION = "Select music video to play"