

import React, { useState, useEffect } from 'react';
import yaml from 'js-yaml';

interface FinalReviewItem {
  id: string;
  title: string;
  description: string;
  component: string;
  section?: string;
  expectedStandard: string;
  identifiedGap: string;
  proposeFix: string;
}

interface BaselineTableProps {
  baselineResult: string;
  setBaselineResult: (r: string) => void;
  isGuidelineRevised: boolean;
  setIsGuidelineRevised: (isRevised: boolean) => void;
}

export const BaselineTable: React.FC<BaselineTableProps> = (props) => {

  const [parsedData, setParsedData] = React.useState<FinalReviewItem[]>([]);
  const [userUpdate, setUserUpdate] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [updateSuccess, setUpdateSuccess] = React.useState(false);

  const [parseError, setParseError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let arr: FinalReviewItem[] = [];
    setParseError(null);
    // 빈 값, 에러 메시지, '-' 등은 빈 배열로 처리
    if (!props.baselineResult || props.baselineResult === '-' || props.baselineResult.startsWith('베이스라인 결과') || props.baselineResult.startsWith('Loading')) {
      setParsedData([]);
      return;
    }
    let cleaned = props.baselineResult;
    // 중첩된 '-' 제거: component 아래에 - expected_standard 등 있으면 한 번만 남기고 제거
    cleaned = cleaned.replace(/(\n\s*-\s*(expected_standard|identified_gap|proposed_fix):)/g, (match) => match.replace('-', ''));
    // 들여쓰기 교정: 각 필드가 2칸 들여쓰기로 시작하도록 변환
    cleaned = cleaned.replace(/^(\s{3,})(expected_standard|identified_gap|proposed_fix):/gm, '  $2:');
    try {
      // Try JSON first
      arr = JSON.parse(cleaned);
    } catch {
      try {
        // Try YAML
        const doc = yaml.load(cleaned);
        if (Array.isArray(doc)) arr = doc as FinalReviewItem[];
        else throw new Error('YAML is not an array');
      } catch (err) {
        setParseError((err instanceof Error ? err.message : String(err)) + '\n' + cleaned);
        arr = [];
      }
    }
    setParsedData(Array.isArray(arr) ? arr : []);
  }, [props.baselineResult]);

  // 실제 /api/baseline 호출 및 결과 반영
  const handleSend = async () => {
    if (!userUpdate.trim()) return;
    setIsLoading(true);
    setUpdateSuccess(false);
    try {
      const formData = new FormData();
      formData.append('user_update', userUpdate);
      formData.append('baseline_solution', props.baselineResult);
      // 필요시 추가 필드
      if (props.hasOwnProperty('guidelinesStr') && (props as any).guidelinesStr) {
        formData.append('guidelines_str', (props as any).guidelinesStr);
      }
      const API_BASE =
        typeof window !== 'undefined' &&
          !process.env.NEXT_PUBLIC_API_BASE &&
          window.location.hostname === 'localhost'
          ? 'http://34.64.194.66:8000'
          : process.env.NEXT_PUBLIC_API_BASE || '';
      const res = await fetch(`${API_BASE}/api/baseline`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorText = await res.text();
        alert(`오류 발생: ${errorText}`);
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      // 실제 결과가 solutions에 있으면 테이블에 반영
      if (Array.isArray(data.solutions)) {
        setParsedData(data.solutions);
        props.setBaselineResult(JSON.stringify(data.solutions, null, 2));
        setUpdateSuccess(true);
      } else if (typeof data.raw === 'string') {
        try {
          const arr = JSON.parse(data.raw);
          setParsedData(Array.isArray(arr) ? arr : []);
          props.setBaselineResult(data.raw);
          setUpdateSuccess(true);
        } catch {
          setParsedData([]);
          props.setBaselineResult(data.raw);
          setUpdateSuccess(true);
        }
      }
      setUserUpdate('');
      // 안내 메시지 2초 후 자동 숨김
      setTimeout(() => setUpdateSuccess(false), 2000);
    } catch (err) {
      alert(`오류 발생: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };


  // Baseline output format에 맞춰 component 기준 그룹화 (null/undefined 안전)
  const grouped = parsedData.reduce((acc, item) => {
    const key = (item && item.component) ? item.component : '기타';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, FinalReviewItem[]>);


  return (
    <div className="flex flex-col h-full p-4 bg-gray-50 rounded-lg" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
      <div className="flex-1 overflow-y-auto mb-4">
        {updateSuccess && (
          <div className="w-full flex flex-col items-center justify-center py-2 text-green-600 text-sm font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            ✅ 업데이트 완료
          </div>
        )}
        {props.baselineResult.startsWith('Loading') ? (
          <div className="w-full flex flex-col items-center justify-center py-12 text-gray-400 text-lg" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            평가 결과를 불러오는 중입니다...
          </div>
        ) : parseError ? (
          <div className="w-full flex flex-col items-center justify-center py-12 text-red-400 text-sm" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            <div>결과 파싱 오류:</div>
            <pre className="bg-gray-100 p-2 rounded text-xs max-w-xl overflow-x-auto whitespace-pre-wrap" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{parseError}</pre>
          </div>
        ) : parsedData.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-12 text-gray-400 text-lg" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            평가 결과가 없습니다.
          </div>
        ) : (
          <div className="w-full flex flex-col space-y-6" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            {Object.entries(grouped).map(([component, items]) => (
              <div key={component} className="w-full p-4 bg-[#F5F5F5] shadow rounded-xl" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-black mb-2" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{component}</h2>
                </div>
                {items.map((item, idx) => (
                  <div key={item?.id ?? idx} className="mb-6">
                    <div className="w-full rounded-lg border border-gray-200 overflow-hidden" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
                      <div className="grid grid-cols-[200px_1fr] border-b border-gray-200">
                        <div className="p-4 bg-gray-100 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>섹션/컴포넌트</div>
                        <div className="p-4 text-gray-600 text-sm bg-white" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{item?.component || item?.section || '-'}</div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr] border-b border-gray-200">
                        <div className="p-4 bg-gray-100 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>권장 기준</div>
                        <div className="p-4 text-gray-600 text-sm bg-white" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{(item as any)?.expected_standard || item?.expectedStandard || '-'}</div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr] border-b border-gray-200">
                        <div className="p-4 bg-gray-100 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>발견된 문제점</div>
                        <div className="p-4 text-gray-600 text-sm bg-white" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{(item as any)?.identified_gap || item?.identifiedGap || '-'}</div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr]">
                        <div className="p-4 bg-gray-100 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>개선 방안</div>
                        <div className="p-4 text-gray-600 text-sm bg-white" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{(item as any)?.proposed_fix || item?.proposeFix || '-'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <h3 className="text-md font-semibold mb-2 text-gray-800" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>수정할 내용이 있다면 입력해주세요</h3>
      <textarea
        className="w-full p-2 border rounded-md mb-4 text-sm text-gray-500 bg-gray-100 focus:outline-none"
        rows={4}
        placeholder="..."
        value={userUpdate}
        onChange={e => setUserUpdate(e.target.value)}
        disabled={isLoading}
        style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
      />
      <button
        className="px-4 py-2 text-sm font-bold rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors self-end disabled:bg-gray-400"
        onClick={handleSend}
        disabled={isLoading}
        style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
      >
        {isLoading ? '요청 중...' : '요청 보내기'}
      </button>
    </div>
  );
}

