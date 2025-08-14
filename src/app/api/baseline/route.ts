import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    // 예시: 필요한 필드 추출
    const userUpdate = formData.get('user_update');
    const baselineSolution = formData.get('baseline_solution');
    // 실제 로직: 여기서 Python API 연동 또는 내부 처리
    // 임시 응답
    return NextResponse.json({
      raw: baselineSolution,
      user_update: userUpdate,
      solutions: [], // 실제 처리 결과로 대체
      message: 'Baseline updated (mock response)'
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
