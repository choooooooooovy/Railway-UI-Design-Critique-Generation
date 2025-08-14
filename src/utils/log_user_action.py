# 테이블 상태 스냅샷 기록 (토글 켤 때 BEFORE, 끌 때 AFTER)
def log_table_edit_snapshot(table_name: str, state: dict, when: str):
    """
    table_name: e.g. 'PERCEPTION-SECTION', 'PERCEPTION-COMPONENT', etc.
    state: 전체 테이블 데이터 (dict or list)
    when: 'BEFORE' (토글 켤 때), 'AFTER' (토글 끌 때)
    """
    log_user_action('edit_table_snapshot', table_name, {
        "when": when,
        "state": state
    })
# 단계별 결과 기록
def log_step_result(step: str, task: str, image_path: str, result: str):
    log_user_action('step_result', step, {"task": task, "imagePath": image_path, "result": result})

import os
import json
from fastapi import Request
from fastapi.responses import JSONResponse
from src.constants import USER_ID

def log_user_action(action_type: str, step_info: str, details: dict = None):
    log_entry = {
        "timestamp": __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        "action_type": action_type,
        "step": step_info,
        "detail": details or {}
    }
    log_dir = os.path.join(os.path.dirname(__file__), '../../logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f'user_{USER_ID}_actions.log')
    with open(log_file, 'a') as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')


# 테이블 수정 시작 (토글 켜기)
def log_table_edit_start(table_name: str):
    log_user_action('edit_table_start', table_name, {})

# 테이블 필드 수정 기록
def log_table_field_edit(table_name: str, row_id: str, field: str, before: str, after: str):
    log_user_action('edit_table_field', table_name, {
        "rowId": row_id,
        "field": field,
        "before": before,
        "after": after
    })

# 테이블 수정 종료 (토글 끄기)
def log_table_edit_end(table_name: str):
    log_user_action('edit_table_end', table_name, {})

# 가이드라인 수정 프롬프트 기록
def log_guideline_edit_prompt(prompt: str, before_guideline: str, after_guideline: str):
    log_user_action('guideline_edit_prompt', prompt, {"beforeGuideline": before_guideline, "afterGuideline": after_guideline})

# 가이드라인 실제 수정 내역 기록
def log_guideline_updated(before_guideline: str, after_guideline: str):
    log_user_action('guideline_updated', 'Guideline updated', {"beforeGuideline": before_guideline, "afterGuideline": after_guideline})

# FastAPI endpoint example
from fastapi import APIRouter
router = APIRouter()

@router.post('/log-action')
async def log_action(request: Request):
    data = await request.json()
    user_id = data.get('userId', 'anonymous')
    action_type = data.get('action_type')
    step_info = data.get('step_info')
    details = data.get('details', {})
    log_user_action(user_id, action_type, step_info, details)
    return JSONResponse({"success": True})
