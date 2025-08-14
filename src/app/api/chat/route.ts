import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // 임시 응답 로직 (실제 AI API 연동 전까지) -> 추후 수정 필요
    const aiResponse = generateMockResponse(message, context);

    return NextResponse.json({
      message: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 임시 Mock 응답 생성 함수 -> 임시기 때문에 추후 수정/삭제
function generateMockResponse(message: string, context: unknown): string {
  // context는 향후 AI API 연동 시 사용될 예정
  console.log('Context received:', context);

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('navigation') || lowerMessage.includes('tab')) {
    return "Based on the baseline critique data, the navigation state visibility issue is a common UX problem. The active tab indicators need better contrast and visual distinction to meet usability standards.";
  }

  if (lowerMessage.includes('fix') || lowerMessage.includes('solution')) {
    return "The proposed fix involves enhancing the active state indicator by increasing underline thickness and incorporating contrasting background highlights. This creates better visual hierarchy and user understanding.";
  }

  if (lowerMessage.includes('component')) {
    return "The critique focuses on the Tab Bar component, specifically the Recent Videos & Trending Videos tabs. This is a critical navigation element that impacts user experience.";
  }

  return `I understand your question about "${message}". Based on the baseline critique data, I can help you analyze the UI design issues and discuss potential improvements. Could you be more specific about which aspect you'd like to explore?`;
}