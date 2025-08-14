import base64
import shutil
import uuid
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import yaml
import os
from dotenv import load_dotenv
load_dotenv(".env.local")

# Replace unguarded autogen imports with guarded ones
try:
    import autogen
    from autogen.agentchat.contrib.multimodal_conversable_agent import MultimodalConversableAgent
    from autogen import UserProxyAgent
    AUTOGEN_AVAILABLE = True
except Exception:
    autogen = None  # type: ignore
    MultimodalConversableAgent = None  # type: ignore
    UserProxyAgent = None  # type: ignore
    AUTOGEN_AVAILABLE = False


# Safe import for logging utilities (fallback to no-ops if missing)
try:
    from src.utils.log_user_action import (
        log_step_result as _log_step_result,
        log_guideline_edit_prompt as _log_guideline_edit_prompt,
        log_guideline_updated as _log_guideline_updated,
        log_user_action as _log_user_action,
    )
except Exception:
    def _log_step_result(**kwargs):
        return None
    def _log_guideline_edit_prompt(**kwargs):
        return None
    def _log_guideline_updated(**kwargs):
        return None
    def _log_user_action(*args, **kwargs):
        return None

# Expose unified names used below
log_step_result = _log_step_result
log_guideline_edit_prompt = _log_guideline_edit_prompt
log_guideline_updated = _log_guideline_updated
log_user_action = _log_user_action

# Safe import for constants (fallback to env/defaults if missing)
try:
    from src.constants import IMAGE_PATH, USER_ID, IMAGE_FILENAME, TASK_DESCRIPTION
except Exception:
    USER_ID = os.getenv("USER_ID", "p01")
    IMAGE_FILENAME = os.getenv("IMAGE_FILENAME", "67512.jpg")
    TASK_DESCRIPTION = os.getenv("TASK_DESCRIPTION", "Select music video to play")
    IMAGE_PATH = os.path.join(os.getcwd(), "public", "stores", IMAGE_FILENAME)

# --- 로그 기록용 API 엔드포인트 추가 ---
from fastapi import Request
import httpx

app = FastAPI()

# Support both /api/log-user-action and legacy path
@app.post("/api/log-user-action/")
@app.post("/api/log-user-action")
@app.post("/log-user-action")
async def log_user_action_api(request: Request):
    try:
        data = await request.json()
        action_type = (data or {}).get('action_type')
        step_info = (data or {}).get('content', '')
        details = (data or {}).get('details', {})
        # Call project logger (no-op if unavailable)
        log_user_action(action_type, step_info, details)
        return {"status": "ok"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
from pydantic import BaseModel
from typing import Dict, Any, List

# --- CORS 미들웨어 설정 추가 ---
# 허용할 출처(프론트엔드 주소) 목록
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vercel 배포를 위해 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- 설정 추가 끝 ---


# Pydantic 모델 정의
class Step2Request(BaseModel):
    task: str
    image_base64: str
    app_ui: Dict[str, Any]

class Step3Request(BaseModel):
    task: str
    image_base64: str
    app_ui: Dict[str, Any]
    app_ui_components: Dict[str, Any]

class Step4Request(BaseModel):
    task: str
    image_base64: str
    app_ui: dict
    step3_results: dict


# === Autogen config ===
# Load config from env var if available; avoid crashing if missing in serverless
if AUTOGEN_AVAILABLE:
    try:
        config_list_4v = []
        config_list_o3 = []
        # Preferred: use OPENAI_API_KEY (Vercel env) if present
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            config_list_4v = [{"model": "gpt-4o", "api_key": openai_key}]
            config_list_o3 = [{"model": "o3-mini", "api_key": openai_key}]
        else:
            # Optional fallback: use JSON file if path provided via env
            CONFIG_JSON_PATH = os.getenv("OAI_CONFIG_LIST_JSON")
            if CONFIG_JSON_PATH:
                config_list_4v = autogen.config_list_from_json(
                    CONFIG_JSON_PATH,
                    filter_dict={"model": ["gpt-4o"]},
                )
                config_list_o3 = autogen.config_list_from_json(
                    CONFIG_JSON_PATH,
                    filter_dict={"model": ["o3-mini"]},
                )
        if not config_list_4v or not config_list_o3:
            raise RuntimeError("LLM config missing: set OPENAI_API_KEY or OAI_CONFIG_LIST_JSON")

        llm_config = {"config_list": config_list_4v, "temperature": 0, "cache_seed": 42}
        eval_config = {"config_list": config_list_o3, "cache_seed": 42}
        user_proxy = UserProxyAgent(
            name="User_proxy",
            system_message="A human admin.",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=0,
            code_execution_config={"use_docker": False},
        )
    except Exception:
        config_list_4v = []
        config_list_o3 = []
        llm_config = {}
        eval_config = {}
        user_proxy = None
else:
    config_list_4v = []
    config_list_o3 = []
    llm_config = {}
    eval_config = {}
    user_proxy = None

# Helper: fetch image from Next.js public URL and return base64 string
async def _get_public_image_base64(request: Request, filename: str) -> str:
    base = str(request.base_url).rstrip('/')
    # Primary URL (same-origin in production on Vercel)
    primary_url = f"{base}/stores/{filename}"
    candidate_urls = [primary_url]
    # Local dev: FastAPI runs on :8000 and Next.js serves /stores on :3000
    if "localhost:8000" in base or "127.0.0.1:8000" in base:
        candidate_urls = [
            f"http://localhost:3000/stores/{filename}",
            f"http://127.0.0.1:3000/stores/{filename}",
            primary_url,
        ]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            last_err = None
            for url in candidate_urls:
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    return base64.b64encode(resp.content).decode("utf-8")
                except Exception as e:
                    last_err = e
                    continue
            raise last_err or RuntimeError("Image fetch failed")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Failed to fetch image from candidates: {candidate_urls}. Error: {e}")

# Add '/api/' prefix variants for all step endpoints to match frontend fetch paths and Vercel routing
@app.post("/api/step1/")
@app.post("/api/step1")
@app.post("/step1/")
async def step1(request: Request, task: str = Form(...), image_filename: str = Form("") ):
    # Guard for missing LLM config
    if user_proxy is None or not llm_config:
        return JSONResponse(status_code=503, content={"error": "LLM config missing on server. Please configure OAI_CONFIG_LIST_JSON or environment for server deployment."})

    effective_filename = image_filename or IMAGE_FILENAME
    print(f"=== Using Image: /stores/{effective_filename}")
    print(f"=== Task: {task}")

    # 이미지 파일을 base64로 인코딩 (via HTTP from Next public)
    try:
        image_base64 = await _get_public_image_base64(request, effective_filename)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": str(e.detail)})

    mime = "image/jpeg" if str(effective_filename).lower().endswith((".jpg", ".jpeg")) else "image/png"
    image_data_url = f"data:{mime};base64,{image_base64}"

    # Autogen Agent 정의
    step1_agent = MultimodalConversableAgent(
    name="UILayoutIdentifier",
    system_message=f'''
        Based on the provided UI image, identify all high-level structural sections of the UI rather than focusing on fine-grained elements.
        Your goal is to segment the UI into clearly defined sections that represent core layout divisions, ensuring structural clarity.

        <instructions>
            # Step 1: Identify Non-App UI Sections (Non-App UI)
            - **Exclude system UI elements** that do not belong to the core app layout.
            - **System UI elements to be ignored**:
                - **Status Bar**: Time, battery, network indicators.
                - **System Navigation Bar**: Home, back, recent apps buttons.
                - **Notification Overlays**: External app banners or notifications.

            # Step 2: Segment the UI into Major App Sections
            - After filtering out Non-App UI elements, **segment the remaining app-specific UI into distinct functional sections**
            - Ensure that **each UI element is accounted for exactly ONCE**, with **NO omissions or overlaps between sections**.

            # Step 3: Define Section Properties
            - **Section Type**: Classify the section based on its primary functional role. If the section serves multiple roles, identify its dominant function.
            - **Position**: Describe the section's relative spatial location within the UI.
            - **Size & Shape**: Specify the **section's dimensions and shape** in relation to the UI layout, **using quantifiable or relative terms** such as percentage-based dimensions or dominant proportions.
        </instructions>

        Output Requirements:
        - The **YAML output content must be written in Korean**.
        - Keep well-known technical UI element names (e.g., "Status Bar", "Navigation Bar") in English without translation.
        - Translate all descriptive sentences (position, size_shape, etc.) into NATURAL Korean.
        - Maintain the YAML structure exactly.
        - Do not output anything outside of the YAML block.

        Follow this structure (yaml format):
        <formatting_example>
        non_app_ui:
            - "<List of system UI elements detected (keep English terms if needed)>"

        app_ui:
            "<section_name>":
                position: "<Korean description with English technical terms kept as-is. Spatial relationship relative to others>"
                size_shape: "<Korean description with English technical terms kept as-is. Overall size and shape description>"
        </formatting_example>
        ''',
        llm_config=llm_config,
    )

    # Autogen 호출
    step1_res = user_proxy.initiate_chat(
        step1_agent,
        message=f"""
        Identify and delineate the major UI sections in the given UI, **ensuring clear segmentation that aligns with the task's objectives**.
        - Task: {task}
        - Image: <img {image_data_url}>
        """
    )

    # 결과 파싱
    raw_content = step1_res.chat_history[1]['content']
    content_stripped = raw_content.strip("```yaml").strip("```").strip()
    print("===== RAW YAML =====")
    print(repr(content_stripped))
    try:
        parsed_yaml = yaml.safe_load(content_stripped)
    except yaml.YAMLError:
        return JSONResponse(status_code=500, content={"error": "YAML parsing failed", "raw_output": raw_content})

    return {
        "non_app_ui": parsed_yaml.get("non_app_ui", []),
        "app_ui": parsed_yaml.get("app_ui", {}),
        "raw": raw_content,
        "task": task,
        "image_path": f"/stores/{effective_filename}",
        "image_url": f"/stores/{effective_filename}",
        "image_base64": image_base64,
        # 로그 기록
        "_log": log_step_result(
            # user_id removed
            step="step1",
            task=task,
            image_path=f"/stores/{effective_filename}",
            result=parsed_yaml,
        )
    }


@app.post("/api/step2/")
@app.post("/api/step2")
@app.post("/step2/")
async def step2(request: Request, request_body: Step2Request):
    if user_proxy is None or not llm_config:
        return JSONResponse(status_code=503, content={"error": "LLM config missing on server."})
    task = request_body.task
    app_ui = request_body.app_ui
    try:
        image_base64 = await _get_public_image_base64(request, IMAGE_FILENAME)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": str(e.detail)})
    image_data_url = f"data:image/jpeg;base64,{image_base64}"

    # step2 에이전트 정의
    step2_agent = MultimodalConversableAgent(
        name="UIComponentIdentifier",
        system_message=f''' 
        Based on the provided UI image and overall structure, identify **ALL UI components within the target section**, ensuring **exhaustive detection without omission, or duplication**.
        - Exclude system UI elements, even if they are visually adjacent (System UI elements refer to OS-level components, such as the status bar, navigation bar, or persistent global UI elements).
        - Do NOT speculate. Do not add components based on knowledge of typical UI design.
        - Do NOT infer, assume, or generalize based on common UI conventions, component names, or expected functionality.  

        <instructions>
        # Step 1: Identify ALL UI Components
        - Ensure a comprehensive identification of ALL UI components within the section.

        # Step 2: Define Component Properties
        For each identified component, capture the following attributes:
        - **Component Type**: Categorize the UI component (e.g., button, input field, icon, image, text block).
        - **Position**: Describe the component's **relative spatial location within the UI**, referencing key landmarks.
        - **Size & Shape**: Specify the **component's dimensions and shape** in relation to the section, using **quantifiable or relative terms**.
        - **Sub-Components & Grouping**:
            - Extract and list all sub-components for each identified component.
            - For text-based elements, **transcribe exactly** as visually appears including line breaks (`\\n`), punctuation, spacing — no rewording.
            - Maintain order: top→bottom, left→right.
            - Represent hierarchical grouping if applicable.
        </instructions>

        Output Requirements:
        - The **YAML output content must be written in Korean**.
        - Keep well-known technical UI element names (e.g., "button", "Status Bar", "icon") in English without translation.
        - Translate all descriptive sentences (position, size_shape, etc.) into natural Korean.
        - Maintain the YAML structure exactly.
        - Do not output anything outside of the YAML block.

        Follow this structure (yaml format):
        <formatting_example>
        "<section>":
            "<component>":
                position: "<Korean description with English technical terms kept as-is. Spatial relationship relative to section landmarks>"
                size_shape: "<Korean description with English technical terms kept as-is. Overall size and shape description>"
                sub_components:
                    - "<sub-component 1 (keep English terms if needed)>"
                    - "<sub-component 2 (keep English terms if needed)>"
        </formatting_example>
        ''',
        llm_config=llm_config,
    )

    # step2 실행 (섹션별 반복)
    sections = list(app_ui.keys())
    step2_results = {}

    for section_name in sections:
        try:
            print(f"▶ Analyzing section: {section_name}")
            res = user_proxy.initiate_chat(
                step2_agent,
                message=f"""
Identify all UI components within the '{section_name}' section from the given UI, ensuring completeness without omissions.
- Overall Structure: {app_ui}
- Image: <img {image_data_url}>
"""
            )

            raw = res.chat_history[1]['content']
            cleaned = raw.strip("```yaml").strip("```").strip()
            parsed = yaml.safe_load(cleaned)
            step2_results[section_name] = parsed.get(section_name, parsed)

        except Exception as e:
            step2_results[section_name] = {"error": str(e)}

    # 로그 기록
    log_step_result(
        # user_id removed
        step="step2",
        task=task,
        image_path=None,
        result=step2_results,
    )
    return {"result": step2_results}



@app.post("/api/step3/")
@app.post("/api/step3")
@app.post("/step3/")
async def step3(request: Request, request_body: Step3Request):
    if user_proxy is None or not llm_config:
        return JSONResponse(status_code=503, content={"error": "LLM config missing on server."})
    task = request_body.task
    app_ui = request_body.app_ui
    app_ui_components = request_body.app_ui_components
    try:
        image_base64 = await _get_public_image_base64(request, IMAGE_FILENAME)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": str(e.detail)})
    image_data_url = f"data:image/png;base64,{image_base64}"

    step3_agent = MultimodalConversableAgent(
        name="UIComponentAnalyzer",
        system_message=f'''
        Analyze **each UI component**, extracting both its **visual characteristics** and **functional characteristics**.
        Provide a structured and **highly detailed analysis in natural language**, ensuring that the description captures **exactly what is visually observed**.
        
        Exclude system UI elements and components from other sections, even if they are visually adjacent (System UI elements refer to OS-level components, such as the status bar, navigation bar, or persistent global UI elements).

        <instructions>
        # Step 1: Describe Visual Characteristics
        - Describe the component's shape, size, color, layout, spacing, alignment, and visual grouping.
        - Be **granular and vivid**, as if explaining to someone with **no access to the image**.
        - Describe **only what is directly visible** in the image.
        - Do **not infer purpose or meaning** of an icon, image, or shape based on nearby text, ONLY describe what it **visually looks like**.
        - Describe the text **EXACTLY as it visually appears** — **do not reflow or reword the text** in any way.
        - Your descriptions MUST match the appearance exactly as it is, including **every visible detail**.  

        # Step 2: Describe Functional Characteristics
        - Provide an **objective** explanation of what the component appears to do, **based on its visible features**.  
        - Explain how the component fits into the **overall UI flow**, if that can be determined from visual context only.  
        - Describe the current state of the component (e.g., selected, enabled, disabled, hovered, expanded, collapsed).
        - Do **not** assign interactive behavior or meaning unless it is explicitly visible or labeled.
        </instructions>

        Output Requirements:
        - The **YAML output content must be written in Korean**.
        - Keep well-known technical UI element names (e.g., "button", "Status Bar", "icon") in English without translation.
        - Translate all descriptive sentences into natural Korean while keeping English UI terms unchanged.
        - Maintain the YAML structure exactly.
        - Do not output anything outside of the YAML block.

        Follow this structure (yaml format):
        <formatting_example>
        "<component>":
            visual_characteristics: "<Korean description with English technical terms kept as-is. Detailed visual description>"
            functional_characteristics: "<Korean description with English technical terms kept as-is. Functional description based only on visible features>"
        </formatting_example>
        ''',
        llm_config=llm_config,
    )


    step3_results = {}

    if not app_ui_components or len(app_ui_components) == 0:
        print("❌ app_ui_components가 비어있거나 None입니다!")
        return {"result": {"error": "No UI components provided"}}

    print(f"🔄 {len(app_ui_components)}개 섹션 처리 시작...")

    for section_name, component_data in app_ui_components.items():
        try:
            print(f"▶ Evaluating detailed components in section: {section_name}...")
            print(f"   Component data: {component_data}")

            message = f"""
            Provide a detailed analysis of the **visual characteristics** and **visible functional roles** of each UI component within the '{section_name}' section.
            - Task: {task}
            - Image: <img {image_data_url}>
            - Component List from '{section_name}' section: {component_data}
            """

            component_evaluation_res = user_proxy.initiate_chat(
                step3_agent, 
                message=message
            )

            step3_results.setdefault(section_name, {})

            raw_response = component_evaluation_res.chat_history[1].get("content", "").strip()

            if raw_response.startswith("```yaml"):
                raw_response = raw_response.removeprefix("```yaml").removesuffix("```").strip()

            try:
                parsed_yaml = yaml.safe_load(raw_response)
                step3_results[section_name] = parsed_yaml
                print(f"✅ {section_name} 섹션 YAML 파싱 성공")
            except yaml.YAMLError as e:
                print(f"⚠️ YAML parsing error for {section_name}: {e}")
                step3_results[section_name] = {"error": f"YAML parsing error: {e}"}
                continue

            print(f"✅ Detailed evaluation for {section_name} completed.")

        except Exception as e:
            print(f"❌ Error evaluating section '{section_name}': {type(e).__name__}: {e}")
            step3_results[section_name] = {"error": str(e)}
                
    # 로그 기록
    log_step_result(
        # user_id removed
        step="step3",
        task=task,
        image_path=None,
        result=step3_results,
    )
    return {"result": step3_results}

# --- Step 4 엔드포인트 수정 ---

@app.post("/api/step4/")
@app.post("/api/step4")
@app.post("/step4/")
async def step4_endpoint(request: Request, request_body: Step4Request):
    if user_proxy is None or not llm_config:
        return JSONResponse(status_code=503, content={"error": "LLM config missing on server."})
    task = request_body.task
    app_ui = request_body.app_ui
    step3_results = request_body.step3_results
    try:
        image_base64 = await _get_public_image_base64(request, IMAGE_FILENAME)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": str(e.detail)})
    image_data_url = f"data:image/png;base64,{image_base64}"

    step4_agent = MultimodalConversableAgent(
        name="UILayoutAnalyzer",
        system_message=f'''
        Analyze **each UI section**, focusing on its **overall visual structure** and **functional role** in the user interface.
        Your analysis should reflect a **section-level perspective**, emphasizing how all elements work together visually and functionally as a unit.

        Do not describe individual components in isolation.
        Instead, describe how the visual arrangement, grouping, and layout of components contribute to the **section's visual identity** and **role in task completion**.

        Do not invent or assume information beyond what is shown in the image.
        **Exclude system UI elements and elements from other sections**, even if they are visually adjacent (e.g., OS-level status bar or navigation bar).

        <instructions>
            # Step 1: Describe Visual Characteristics
            - Provide a holistic description of the section's **overall layout and structure**, including spatial arrangement, grouping of elements, alignment, and flow.
            - Comment on **Visual Hierarchy** (e.g., what draws attention first), **Color & Contrast**, **Typography**, and **Density**.
            - Highlight how elements are visually grouped or differentiated to guide attention or comprehension.
            - Do **not** describe components one-by-one, but instead describe how they appear **together** as a structured whole.

            # Step 2: Describe Functional Characteristics
            - Explain what the section appears to do in the interface, based on its structure and visual presentation.
            - Describe how the section contributes to the **overall user flow**, and how it enables or supports user interaction in the context of the given task.
            - If the function is unclear or not explicitly shown, describe what is visually implied, but avoid guessing.
        </instructions>

        Output Requirements:
        - The **YAML output content must be written in Korean**.
        - Keep well-known technical UI element names (e.g., "Navigation Bar", "Status Bar", "button") in English without translation.
        - Translate all descriptive sentences into natural Korean while keeping English UI terms unchanged.
        - Maintain the YAML structure exactly.
        - Do not output anything outside of the YAML block.

        Follow this structure (yaml format):
        <formatting_example>
        "<section>":
            visual_characteristics: "<Korean description with English technical terms kept as-is. Detailed description of the section's visual appearance>"
            functional_characteristics: "<Korean description with English technical terms kept as-is. Explanation of the section's purpose and contribution to the UI experience>"
        </formatting_example>
        ''',
        llm_config=llm_config,
    )

    step4_results = {}

    for section_name, component_analysis in step3_results.items():
        try:
            print(f"▶ Analyzing section level: {section_name}")

            if section_name not in app_ui:
                step4_results[section_name] = {"error": f"Section '{section_name}' not found in app_ui."}
                continue

            message = f"""
            Provide a detailed analysis of the **visual characteristics** and **visible functional roles** of the '{section_name}' section.
            - Task: {task}
            - Image: <img {image_data_url}>
            - Section Structure: {app_ui.get(section_name, {})}
            - Visual and functional characteristics of each components within the '{section_name}' section: {component_analysis}
            """

            section_analysis_res = user_proxy.initiate_chat(
                step4_agent,
                message=message,
            )

            raw_response = section_analysis_res.chat_history[1].get("content", "").strip()
            if raw_response.startswith("```yaml"):
                raw_response = raw_response.removeprefix("```yaml").removesuffix("```").strip()
            
            parsed_yaml = yaml.safe_load(raw_response)
            step4_results[section_name] = parsed_yaml.get(section_name, parsed_yaml)

        except Exception as e:
            print(f"❌ Error evaluating section '{section_name}': {type(e).__name__}: {e}")
            step4_results[section_name] = {"error": str(e)}

    # 로그 기록
    log_step_result(
        # user_id removed
        step="step4",
        task=task,
        image_path=None,
        result=step4_results,
    )
    return {"result": step4_results}




@app.post("/api/step5_6/")
@app.post("/api/step5_6")
@app.post("/step5_6/")
async def step5_6_endpoint(
    task: str = Form(...),
    image_base64: str = Form(...),
    step3_results_str: str = Form(...),
    step4_results_str: str = Form(...),
    guidelines_str: str = Form(...),
):
    """
    Combined endpoint for Step 5 (Layout Evaluation) and Step 6 (Component Evaluation).
    """
    image_data_url = f"data:image/png;base64,{image_base64}"
    step5_result = {}
    step6_results = {}

    # --- Part 1: Step 5 Logic (Layout Evaluation) ---
    try:
        print("▶️ Starting Step 5: Layout Evaluation...")
        step4_results = yaml.safe_load(step4_results_str)
        
        step5_agent = MultimodalConversableAgent(
            name="UILayoutEvaluator",
            system_message=f'''
            Evaluate the **macro-level layout, spatial structure, and visual hierarchy** of the UI — without analyzing function, behavior, or meaning of components.  
            Apply the following evaluation guidelines, but apply them only in a **layout-centric** context: {guidelines_str}
            
            <instructions>
            You must focus your evaluation on the **MACRO-level structure** of the UI layout — this includes overall spatial alignment, section grouping, and visual hierarchy across or within sections.
            **Exclude system UI elements and elements from other sections**, even if they are visually adjacent (e.g., OS-level status bar or navigation bar).

            What to evaluate:
            - Section positioning, size, order, and alignment across the screen
            - Component grouping and spatial alignment **within each section**
            - Layout clarity, scanning flow, and structural predictability
            - Identify:
                - Poor visual hierarchy across or within sections
                - Visual clutter
                - Misaligned or inconsistently grouped elements

            What NOT to evaluate:
            - Do not analyze component function, labels, icons, behavior, feedback, or interaction.
            - Do not evaluate colors, shadows, visual styles, or animation.
            - Do NOT refer to OS-level UI (e.g., status bar, navigation bar) or guidelines beyond layout-level observations.

            For each issue, include:
            - expected_standard: Clearly state the usability principle being violated and how it impacts user experience. Start with "The expected standard is that..."
            - identified_gap: Describe in detail how the issue affects user efficiency, cognitive load, or interaction flow. Start with "In the current design, ..."

            Output must include:
            - global_issues: issues affecting multiple sections or the whole screen
            - section_issues: dictionary of issues per section
            </instructions>

            Output Requirements:
            - The **YAML output content must be written in Korean**.
            - Keep well-known technical UI element names (e.g., "Navigation Bar", "Status Bar", "button") in English without translation.
            - Translate all descriptive sentences into natural Korean while keeping English UI terms unchanged.
            - Maintain the YAML structure exactly.
            - Do not output anything outside of the YAML block.

            Follow this structure (yaml format):
            <formatting_example>
            global_issues:
                - expected_standard: "<Korean description with English technical terms kept as-is. State the violated usability principle>"
                identified_gap: "<Korean description with English technical terms kept as-is. Detailed explanation of the gap>"

            section_issues:
                <section_name>:
                    - expected_standard: "<Korean description with English technical terms kept as-is. State the violated usability principle>"
                    identified_gap: "<Korean description with English technical terms kept as-is. Detailed explanation of the gap>"
            </formatting_example>
            ''',
            llm_config=llm_config,
        )


        step5_res = user_proxy.initiate_chat(
            step5_agent,
            message=f"""Evaluate the **macro-level layout, spatial structure, and visual hierarchy** of the UI.
            - Task: {task}.
            - Visual and functional characteristics of each sections: {step4_results}
            - Image: <img {image_data_url}>
            """,
        )

        raw_response_5 = step5_res.chat_history[1]['content'].strip()
        if raw_response_5.startswith("```yaml"):
            raw_response_5 = raw_response_5.removeprefix("```yaml").removesuffix("```").strip()
        
        step5_result = yaml.safe_load(raw_response_5)
        print("✅ Step 5 completed.")

    except Exception as e:
        print(f"❌ Error in Step 5 part: {type(e).__name__}: {e}")
        step5_result = {"error": f"Error in Step 5: {str(e)}"}


    # --- Part 2: Step 6 Logic (Component Evaluation) ---
    try:
        print("▶️ Starting Step 6: Detailed Component Evaluation...")
        step3_results = yaml.safe_load(step3_results_str)

        step6_agent = MultimodalConversableAgent(
            name="UIComponentEvaluator",
            system_message=f'''
            Evaluate the **visual clarity, recognizability, and visual consistency** of UI components in each section of a static UI screen.
            Apply the following evaluation guidelines, but apply them strictly to **visual perception only**: {guidelines_str}

            <instructions>
            Focus your evaluation on the **collective visual coherence** of components, not just isolated issues.

            What to evaluate:
            - Legibility of text and icons
            - Consistency in style and size across similar components
            - Alignment and spacing between components within the section
            - Visual hierarchy, position, and interpretability
            - Unnecessary visual variations or redundancies

            What NOT to evaluate:
            - Interactive feedback (tap, hover, click, animation, response)
            - Platform conventions or accessibility guidelines unless visibly violated
            - User testing insights or functional assumptions

            Provide issue-level feedback **only if** there is a **clear visual usability concern** that impacts recognizability, clarity, or scanning.

            For each issue, include:
            - expected_standard: Clearly state the usability principle being violated and how it impacts user experience. Start with "The expected standard is that..."
            - identified_gap: Describe in detail how the issue affects user efficiency, cognitive load, or interaction flow. Start with "In the current design, ..."
            </instructions>

            Output Requirements:
            - The **YAML output content must be written in Korean**.
            - Keep well-known technical UI element names (e.g., "icon", "button", "Navigation Bar", "Status Bar") in English without translation.
            - Translate all descriptive sentences into natural Korean while keeping English UI terms unchanged.
            - Maintain the YAML structure exactly.
            - Do not output anything outside of the YAML block.

            Follow this structure (yaml format):
            <formatting_example>
            <section_name>:
            component_issues:
                "<component_name>":
                - expected_standard: "<Korean description with English technical terms kept as-is. State the violated usability principle>"
                    identified_gap: "<Korean description with English technical terms kept as-is. Detail how the issue affects recognizability/clarity/scanning>"
            </formatting_example>
            ''',
            llm_config=llm_config,
        )


        for section_name, component_data in step3_results.items():
            try:
                print(f"Evaluating detailed components in section: {section_name}...")

                evaluation_message = f"""
                Evaluate the **visual clarity, recognizability, and visual consistency of UI COMPONENTS within the '{section_name}' section**, based on how they appear **collectively**.
                Do not focus on interactivity or function. Identify only visual-related problems.
                - Task: {task}.
                - Visual and functional characteristics of components:\n{yaml.dump(component_data, allow_unicode=True, sort_keys=False)}
                - Image: <img {image_data_url}>
                """

                component_evaluation_res = user_proxy.initiate_chat(step6_agent, message=evaluation_message)

                raw_6 = component_evaluation_res.chat_history[1]['content'].strip()
                if raw_6.startswith("```yaml"):
                    raw_6 = raw_6.removeprefix("```yaml").removesuffix("```").strip()
                
                parsed_6 = yaml.safe_load(raw_6)

                step6_results[section_name] = parsed_6.get(section_name, parsed_6)
                print(f"Detailed evaluation for {section_name} completed.")

            except Exception as e:
                print(f"Error evaluating detailed components in section {section_name}: {e}")
                step6_results[section_name] = {"error": str(e)}
        
        print("✅ Step 6 completed.")

    except Exception as e:
        print(f"❌ Error in Step 6 part: {type(e).__name__}: {e}")
        step6_results = {"error": f"Error in Step 6: {str(e)}"}

    # 로그 기록
    log_step_result(
        # user_id removed
        step="step5",
        task=task,
        image_path=None,
        result=step5_result,
    )
    log_step_result(
        # user_id removed
        step="step6",
        task=task,
        image_path=None,
        result=step6_results,
    )
    return {"step5_result": step5_result, "step6_result": step6_results}


@app.post("/api/step7/")
@app.post("/api/step7")
@app.post("/step7/")
async def step7_endpoint(
    task: str = Form(...),
    step3_results_str: str = Form(...),
    step4_results_str: str = Form(...),
    step5_results_str: str = Form(...),
    step6_results_str: str = Form(...),
    guidelines_str: str = Form(...),
):
    try:
        print("▶️ Starting Step 7: Final Evaluation...")
        step3_results = yaml.safe_load(step3_results_str)
        step4_results = yaml.safe_load(step4_results_str)
        step5_result = yaml.safe_load(step5_results_str)
        step6_results = yaml.safe_load(step6_results_str)

        analyzer_res = {
            "section_analysis": step4_results,
            "component_analysis": step3_results
        }

        step7 = MultimodalConversableAgent(
            name="FinalEvaluator",
            system_message=f'''
            You are the Administrator of a Usability Evaluation Assistant system.

            Your goal is to 
                (1) systematically analyze usability issues and identify root causes based on the visual and functional characteristics of UI
                (2) develop validated, execution-ready solutions iteratively

            Apply the following evaluation guidelines: {guidelines_str}
            
            <instructions>
            # Step 1: Categorization & ReAct-Based Multi-Level Root Cause Analysis
            - **Group issues logically based on usability concerns, NOT by location.**
            - **Identify the underlying patterns** in usability issues and detect their **root causes** before suggesting solutions.
            - Categorization should not be arbitrary; it must reflect **actual UX pain points**.
            - Key Considerations:
                - Are multiple issues caused by a single underlying problem?
                - Are there systemic design flaws contributing to multiple issues?
            - Apply the **ReAct framework iteratively to identify the fundamental root cause**:
            - **Ask "Why?" multiple times** to uncover deeper usability breakdowns.
            - Focus on **visual hierarchy, UI consistency, affordance, interaction patterns, and user expectations**.
            - The **last element of the root_cause array should represent the final, validated root cause**.

            # Step 2: ReAct-Based Solution Development & UI-Wide Impact Evaluation
            - Develop **structured, practical, and directly applicable solutions** based on the identified root causes.
            - **Explicitly define UI modifications** (spacing, typography, color contrast, layout changes, etc.).
            - **Solution Validation & UI-Wide Impact Evaluation is built into this step**:
                - Apply the proposed solution in a controlled environment.
                - Evaluate its impact **not only on the affected section but on the ENTIRE UI/UX system**.
                - If the solution introduces new usability problems, **reapply ReAct framework to refine the approach**.
                - If necessary, **iterate until the solution is execution-ready and validated**.

            - Solution Development:
                - Propose **clear, structured, and actionable usability solutions** based on the visual and functional characteristics of UI.
                - Ensure solutions **adhere to given guidelines**.
                - **Explicitly specify UI modifications** (e.g., spacing, typography, color contrast, layout) based on visual and functional characteristics of UI.
            </instructions>

            Output Requirements:
            - The **YAML output content must be written in Korean**.
            - Keep well-known technical UI element names (e.g., "button", "Status Bar", "Navigation Bar") in English without translation.
            - Translate all descriptive sentences into natural Korean while keeping English UI terms unchanged.
            - Maintain the YAML structure exactly.
            - Do not output anything outside of the YAML block.

            Follow this structure (yaml format):
            <formatting_example>
            categories:
            "<category_name>":
                root_cause:
                - "<Korean description with English technical terms kept as-is. Progressive why-analysis steps>"
                solution:
                - "<Korean description with English technical terms kept as-is. Execution-ready solution and UI-wide impact evaluation>"
            </formatting_example>
            ''',
            llm_config=eval_config,
        )


        # Step 7-1: Categorization & Multi-Level Root Cause Analysis Using ReAct
        step7_1_message = f"""
        **Step 1: Categorization & Multi-Level Root Cause Analysis (Using ReAct)**
        Categorize usability issues and iteratively apply the ReAct framework to uncover deeper root causes.

        - Task: {task}.
        # Section-Level UI Evaluation Results: {step5_result}
        # Component-Level UI Evaluation Results: {step6_results}

        <instructions>
            1. **Categorization**:
                - Group issues **based on shared usability concerns**, NOT based on location.
                - Categories should reflect fundamental usability problems.

            2. **Iterative Root Cause Analysis (Using ReAct)**:
                **Thought:**  
                    - Identify the **first-level root cause**.  
                    - Ask **"Why does this happen?"** recursively until the **fundamental root cause** is found.  
                    - The **final element in the root_cause list** should reflect the true underlying issue.  
                **Action:**  
                    - Determine if further investigation is needed.  
                    - Ensure the root cause does **not introduce new usability issues**.  

            3. **Final Root Cause Statement**:
                - Summarize the **series of root causes** leading to the final root cause.
        </instructions>


        Follow this structure (yaml format):
        <formatting_example>
            categorized_issues:
                "<category_name>":
                    root_cause:
                        - "First-level cause"
                        - "Second-level cause"
                        - ...
                        - "Final root cause"
                    issues:
                        - component: "<Component Name>"
                          description: "<Original usability issue description>"
        </formatting_example>
        """

        step7_1_res = user_proxy.initiate_chat(step7, message=step7_1_message)
        categorized_issues_with_root_causes_raw = step7_1_res.chat_history[-1]['content']
        if "```yaml" in categorized_issues_with_root_causes_raw:
            categorized_issues_with_root_causes_raw = categorized_issues_with_root_causes_raw.split("```yaml")[1].split("```")[0].strip()
        
        categorized_issues_with_root_causes = yaml.safe_load(categorized_issues_with_root_causes_raw)
        print("✅ Step 7-1 completed.")

        step7_2_message_template = f"""
        **Step 2: ReAct-Based Solution Development & UI-Wide Impact Evaluation**
        Propose usability solutions that optimize usability and interaction flow while maintaining design clarity.

        To ensure that proposed solutions align with real-world user interactions, refer to the following:
        # Categorized Issues with Root Causes: {categorized_issues_with_root_causes}
        # Visual & functional characteristics of UI: {analyzer_res}

        <instructions>
            For each **issue category**, apply the **ReAct framework** to develop actionable, UI-grounded solutions.

            1. Thought  
            - Based on the root cause identified above, describe what kind of UI/UX improvement is needed.  
            - Clearly articulate why the existing design hinders usability and what the intended improvement aims to accomplish (e.g., improve visual hierarchy, reduce cognitive load, clarify affordance).

            2. Action  
            - Propose a **specific, concrete and implementable design solution** that directly addresses the identified issue.
            - Specify **exact** UI modifications (e.g., spacing, alignment, hierarchy, color use, component grouping)
            - Ensure the proposal is feasible within a mobile UI environment
            - The solution must maintain visual and interactional consistency while **avoiding unnecessary complexity**.

            3. Evaluate Impact  
            **Consider broader implications**:
                - Will the change improve consistency or usability elsewhere in the UI?
                - Could it introduce unintended side effects?
                - Does it negatively impact other UI components? (e.g., adjacent elements' visibility, layout balance, readability)  
                    - If so, **RETURN to Thought** and REVISE the solution accordingly
                    - The iteration process continues until the solution effectively resolves the issue without creating new usability problems.
        </instructions>

        Follow this structure (.yaml format):
        <formatting_example>
            "<category_name>":
                root_cause: "<Fundamental cause of these issues>"
                individual_fixes:
                - component: "<Affected Component>"
                  issue: "<Brief issue summary>"
                  final_solution:
                    expected_standard: "<String>"
                    identified_gap: "<String>"
                    proposed_fix: "<String>"
        </formatting_example>
        """

        # Step 7-2 실행
        step7_2_res = user_proxy.initiate_chat(
            step7,
            message=step7_2_message_template
        )
        solution_output_raw = step7_2_res.chat_history[-1]['content']
        if "```yaml" in solution_output_raw:
            solution_output_raw = solution_output_raw.split("```yaml")[1].split("```")[0].strip()

        solution_output = yaml.safe_load(solution_output_raw)
        print("✅ Step 7-2 completed.")

        # 로그 기록
        log_step_result(
            # user_id removed
            step="step7",
            task=task,
            image_path=None,
            result=solution_output,
        )
        return {"solution": solution_output}

    except Exception as e:
        print(f"❌ Error in Step 7 part: {type(e).__name__}: {e}")
        return JSONResponse(status_code=500, content={"error": f"Error in Step 7: {str(e)}"})


@app.post("/api/update_guidelines/")
@app.post("/api/update_guidelines")
@app.post("/update_guidelines/")
async def update_guidelines(
    user_update: str = Form(...), 
    default_guidelines: str = Form(...),
    task: str = Form(...),
    image_base64: str = Form(...),
    step3_results_str: str = Form(...),
    step4_results_str: str = Form(...),
):
    
    # API-level cache key
    cache_key = f"{user_update}:{default_guidelines}"
    if cache_key in guideline_update_cache:
        print(f"✅ Returning cached result for: {cache_key}")
        cached_result = guideline_update_cache[cache_key].copy()
        cached_result.update({
            "task": task,
            "image_base64": image_base64,
            "step3_results_str": step3_results_str,
            "step4_results_str": step4_results_str,
        })
        return cached_result
        
    print(f"▶️ No cache found for: {cache_key}. Generating new guideline...")
    _editor = MultimodalConversableAgent(
        name="GLEditor",
        system_message="""
You are an expert UX-guideline editor with deep understanding of various design frameworks and usability principles.

<input>
- `default_guidelines`: plain-text list of current guidelines.
- `user_update`: free-form instructions for modifications (add/delete/merge/rephrase/emphasize/reorganize).
</input>

<task>
Intelligently interpret and apply user modifications to the guidelines, supporting various types of updates:

1) **Content Modifications**:
   - Add new guidelines or principles
   - Delete existing guidelines
   - Merge or split guidelines
   - Rephrase or reword content
   - Emphasize specific aspects (make more prominent)
   - De-emphasize or soften language

2) **Structural Changes**:
   - Group related guidelines together
   - Create sub-categories or hierarchies
   - Renumber appropriately (use fractional IDs like 4.1, 4.2 for insertions)

3) **Framework Switching**:
   - Switch to different design systems (Material Design, Apple HIG, etc.)
   - Combine multiple frameworks
   - Create domain-specific guidelines (mobile, web, accessibility-focused, etc.)

4) **Contextual Adaptations**:
   - Adapt guidelines for specific contexts (e.g., mobile-first, accessibility, specific industries)
   - Add contextual examples or clarifications
   - Modify language tone (more/less formal, technical, prescriptive)
</task>

<interpretation_guidelines>
- **Emphasis requests**: 
  - "emphasize X" → expand description, add examples, make content more detailed
  - "focus on Y" → reorganize with Y-related guidelines first
  - "highlight Z" → make Z more prominent in relevant guidelines

- **Combination requests**:
  - "add [specific principle]" → integrate seamlessly with existing guidelines
  - "remove redundancy" → merge overlapping guidelines logically
</interpretation_guidelines>

Follow this structure (strict):
<formatting_example>
```yaml
change_log:
  - "[Specific changes made with rationale]"
  - "[Impact on guideline content]"

guidelines:
  - id: 1
    title: "[Guideline Title]"
    description: "[Complete guideline description]"
  - id: 2
    title: "[Next Guideline Title]"
    description: "[Complete guideline description]"
```
</formatting_example>

<rules>
- Maintain logical flow and coherence across guidelines
- For framework switches, completely regenerate guidelines using that framework's approach
- Handle ambiguous requests by choosing the most beneficial interpretation
- Maintain professional, actionable language throughout
</rules>
""",
        llm_config={"config_list": config_list_4v, "temperature": 0},
    )

    try:
        _editor_res = user_proxy.initiate_chat(
            _editor,
            message=f"user_update: {user_update}\ndefault_guidelines: {default_guidelines}",
            auto_reply=False,
            max_turns=1
        )

        # Extract and parse the response
        edited_gl_raw = _editor_res.chat_history[-1]['content']
        if "```yaml" in edited_gl_raw:
            edited_gl_str = edited_gl_raw.split("```yaml")[1].split("```")[0].strip()
        else:
            edited_gl_str = edited_gl_raw

        edited_gl = yaml.safe_load(edited_gl_str)
        
        _guideline_list = edited_gl.get('guidelines', [])
        _change_log_list = edited_gl.get('change_log', [])
        
        # Format the guidelines back into a single string
        _guideline = "\n".join(
            [f"{g.get('id', '')}. **{g.get('title', '')}**: {g.get('description', g.get('text', ''))}" for g in _guideline_list]
        )

        # Format the change log into a single string
        _change_log = "\n".join([f"- {log}" for log in _change_log_list])
        
        # Cache only the generated content
        result_to_cache = {"guidelines": _guideline, "change_log": _change_log}
        guideline_update_cache[cache_key] = result_to_cache
        print(f"✅ Result cached for: {cache_key}")

        # Return the cached content plus the passthrough data for the next step
        response = result_to_cache.copy()
        response.update({
            "task": task,
            "image_base64": image_base64,
            "step3_results_str": step3_results_str,
            "step4_results_str": step4_results_str,
        })
        # 가이드라인 수정 로그 기록
        log_guideline_edit_prompt(
            # user_id removed
            prompt=user_update,
            before_guideline=default_guidelines,
            after_guideline=response.get("guidelines", "")
        )
        log_guideline_updated(
            # user_id removed
            before_guideline=default_guidelines,
            after_guideline=response.get("guidelines", "")
        )
        return response

    except Exception as e:
        print(f"Error during guideline update: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/baseline/")
@app.post("/api/baseline")
@app.post("/baseline/")
@app.get("/api/baseline/")
@app.get("/api/baseline")
@app.get("/baseline/")
async def baseline_endpoint(request: Request, task: str = Form(None), rico_id: str = Form(None), guidelines_str: str = Form(None)):
    import os
    from datetime import datetime
    def log_baseline_update(user_id, before, after, note, initial=False):
        log_dir = os.path.join(os.getcwd(), "logs", "_baseline")
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, f"{user_id}_baseline.log")
        with open(log_path, "a", encoding="utf-8") as f:
            if initial:
                f.write(f"[{datetime.now().isoformat()}] initial_baseline\n---result---\n{after}\n\n")
            else:
                f.write(f"[{datetime.now().isoformat()}] user_update: {note}\n---before---\n{before}\n---after---\n{after}\n\n")
    if user_proxy is None or not llm_config:
        return JSONResponse(status_code=503, content={"error": "LLM config missing on server."})

    # GET: health check
    if request.method == "GET":
        return {"status": "ok", "message": "Baseline endpoint is reachable.", "task": task, "rico_id": rico_id}

    # POST: baseline or revision
    form = await request.form()
    user_update = form.get("user_update")
    baseline_solution = form.get("baseline_solution")
    guidelines_str_post = form.get("guidelines_str") or guidelines_str

    image_base64 = await _get_public_image_base64(request, IMAGE_FILENAME)
    image_data_url = f"data:image/png;base64,{image_base64}"

    base = MultimodalConversableAgent(
        name="BaseEvaluator",
        system_message=f'''
        You are the Administrator of a Usability Evaluation Assistant system.

        Your goal is to 
            (1) systematically analyze usability issues of the given UI
            (2) develop validated, execution-ready solutions

        Apply the following evaluation guidelines: {guidelines_str_post}
        Ensure solutions **adhere to given guidelines**.

        Language Requirements:
        - **Write all outputs in Korean**.
        - Keep well-known technical usability terms, HCI concepts, or English UI element names in English (e.g., "Navigation Bar", "Fitts' Law", "affordance").
        - Translate all descriptive sentences, reasoning, and explanations into natural Korean.
        - Maintain YAML structure exactly.
        - Do not output anything outside of the YAML block.

        For each issue, include:
        - expected_standard: Clearly state the usability principle being violated and how it impacts user experience. Start with "The expected standard is that..." → translate into Korean while keeping English technical terms as-is.
        - identified_gap: Describe in detail how the issue affects user efficiency, cognitive load, or interaction flow. Start with "In the current design, ..." → translate into Korean while keeping English technical terms as-is.
        - proposed_fix: Propose **clear, structured, and actionable usability solutions** based on the visual and functional characteristics of UI. Translate into Korean while keeping English technical terms as-is.

        Output format (.yaml):
        <formatting_example>
        - component: "<component_name>"
        expected_standard: "<Korean description with English technical terms kept as-is>"
        identified_gap: "<Korean description with English technical terms kept as-is>"
        proposed_fix: "<Korean description with English technical terms kept as-is>"
        </formatting_example>
        ''',
        llm_config=llm_config,
    )


    # 수정 요청이 있으면 _revise_base 실행
    if not user_update and baseline_solution:
        # 최초 baseline 결과 저장
        log_baseline_update("user_p01", None, baseline_solution, None, initial=True)
    if user_update and baseline_solution:
        import yaml
        try:
            parsed_yaml = yaml.safe_load(baseline_solution)
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": f"Invalid baseline_solution YAML: {e}", "raw": baseline_solution})
        try:
            revised = _revise_base(base, parsed_yaml, user_update)
            revised_yaml = yaml.dump(revised, allow_unicode=True, sort_keys=False)
            # 수정 로그 기록
            log_baseline_update("user_p01", baseline_solution, revised_yaml, user_update)
            return {
                "raw": revised_yaml,
                "task": task,
                "image_base64": image_base64,
                "rico_id": rico_id,
            }
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"Revision failed: {e}"})

    # 최초 요청: 기존 방식대로 baseline 생성
    baseline_res = user_proxy.initiate_chat(
        base,
        message=f"""
Propose usability solutions that optimize usability and interaction flow while maintaining design clarity.
- Task: {task}.
- Image: <img {image_data_url}>
"""
    )
    solution_output = baseline_res.chat_history[-1]['content'].strip().removeprefix("```yaml").removesuffix("```").strip()

    try:
        solution_yaml = yaml.safe_load(solution_output)
    except Exception as e:
        solution_yaml = {"error": f"YAML parsing failed: {str(e)}", "raw": solution_output}

    return {
        "raw": solution_output,
        "task": task,
        "image_base64": image_base64,
        "rico_id": rico_id,
    }

# --- Baseline YAML 전체 수정 함수 ---
def _revise_base(
    agent,               # any MultimodalConversableAgent instance
    step_res,            # result dict for that step
    revision_note        # user’s requested changes
):
    """
    Revise the entire YAML structure in step_res based on the user's revision_note.
    No key (section/component) is assumed. The whole YAML is regenerated.
    """
    # 1) Serialize entire YAML
    original_yaml = yaml.dump(step_res, sort_keys=False, allow_unicode=True)

    # 2) Build prompt
    prompt = f"""
Here is the original YAML:
```yaml
{original_yaml}
The user requested the following revision:
"{revision_note}"

Please respond with only the updated YAML block.
Regenerate and modify any fields necessary to reflect the requested changes.
The output must be a complete, well-formed YAML mapping.
"""
    # 3) LLM 응답
    res = user_proxy.initiate_chat(agent, message=prompt)
    raw = res.chat_history[-1]["content"].strip()

    # Remove ``` fences
    lines = raw.splitlines()
    if lines and lines[0].startswith("```"): lines.pop(0)
    if lines and lines[-1].startswith("```"): lines.pop()
    cleaned = "\n".join(lines)

    # Try parsing with safe_load_all
    try:
        docs = list(yaml.safe_load_all(cleaned))
    except yaml.YAMLError as e:
        raise RuntimeError(f"Failed to parse YAML:\n{cleaned}") from e

    # 5) Parse YAML (dict or list)
    try:
        parsed = yaml.safe_load(cleaned)
    except yaml.YAMLError as e:
        raise RuntimeError(f"Failed to parse YAML:\n{cleaned}") from e

    if not isinstance(parsed, (dict, list)):
        raise RuntimeError(f"Invalid YAML root type: {type(parsed)}\n{cleaned}")

    return parsed

# Optional GET for smoke test (POST is used for actual logging)
@app.get("/api/log-user-action")
@app.get("/api/log-user-action/")
@app.get("/log-user-action")
async def log_user_action_get():
    return {"status": "ok"}

# Constants endpoint used by TargetPanel to bootstrap image/task
@app.get("/api/constants")
@app.get("/api/constants/")
async def get_constants():
    try:
        return {
            "image_filename": IMAGE_FILENAME,
            "image_url": f"/stores/{IMAGE_FILENAME}",
            "task_description": TASK_DESCRIPTION,
        }
    except Exception as e:
        # Always return JSON to avoid Unexpected token errors on client
        return JSONResponse(status_code=500, content={"error": str(e)})

# Vercel handler
handler = app
