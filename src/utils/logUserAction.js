// 테이블 상태 스냅샷 기록 (토글 켤 때 BEFORE, 끌 때 AFTER)
export async function logTableEditSnapshot({ tableName, state, when }) {
    await logUserAction({
        action_type: 'edit_table_snapshot',
        content: tableName,
        details: { when, state }
    });
}

// API base URL ('' for same-origin in production). In dev, set NEXT_PUBLIC_API_BASE=http://localhost:8000
// If not set and running on localhost, default to FastAPI port 8000
const API_BASE = (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_BASE && window.location.hostname === 'localhost')
    ? 'http://34.64.194.66:8000'
    : (process.env.NEXT_PUBLIC_API_BASE || '');

// API endpoint for logging
const LOG_API_URL = `${API_BASE}/api/log-user-action/`;

export async function logUserAction({ action_type, content, details = {} }) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        // userId,
        action_type,
        content,
        details
    };
    try {
        let response = await fetch(LOG_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logEntry)
        });
        if (!response.ok) {
            // Try fallback without trailing slash once
            const bodyText = await response.text().catch(() => '');
            console.error('Failed to send user action log:', response.status, bodyText);
            if (response.status === 404 || response.status === 405) {
                try {
                    response = await fetch(`${API_BASE}/api/log-user-action`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(logEntry)
                    });
                    if (!response.ok) {
                        const retryText = await response.text().catch(() => '');
                        console.error('Retry failed (no-slash):', response.status, retryText);
                    }
                } catch (e) {
                    console.error('Retry error (no-slash):', e);
                }
            }
        }
    } catch (err) {
        console.error('Failed to send user action log:', err);
    }
}

export async function logUserPrompt({ userId = 'anonymous', prompt, relatedTask }) {
    await logUserAction({
        userId,
        action_type: 'user_prompt',
        content: prompt,
        details: { relatedTask }
    });
}

export async function logStepResult({ userId = 'anonymous', step, task, imagePath, result, duration }) {
    await logUserAction({
        userId,
        action_type: 'step_result',
        content: step,
        details: { task, imagePath, result, duration }
    });
}

export async function logGuidelineEditPrompt({ userId = 'anonymous', step, prompt, beforeGuideline, afterGuideline }) {
    await logUserAction({
        userId,
        action_type: 'guideline_edit_prompt',
        content: step,
        details: { prompt, beforeGuideline, afterGuideline }
    });
}

export async function logGuidelineUpdated({ userId = 'anonymous', beforeGuideline, afterGuideline }) {
    await logUserAction({
        userId,
        action_type: 'guideline_updated',
        content: 'Guideline updated',
        details: { beforeGuideline, afterGuideline }
    });
}
