"use client";
import React from 'react';
import { BaselineTable } from '../../components/tables/Baseline/BaselineTable';
import TargetPanelBaseline from '../../components/TargetPanelBaseline';

const API_BASE =
  typeof window !== 'undefined' &&
  !process.env.NEXT_PUBLIC_API_BASE &&
  window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : process.env.NEXT_PUBLIC_API_BASE || '';

export default function BaselinePage() {
  // 베이스라인 결과를 받아서 baselineCritique로 전달
  const [baselineCritique, setBaselineCritique] = React.useState('');
  const [isGuidelineRevised, setIsGuidelineRevised] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  // TargetPanelBaseline에서 받아올 값
  const [task, setTask] = React.useState('');
  const [ricoId, setRicoId] = React.useState('');

  React.useEffect(() => {
    if (!task || !ricoId) {
      setLoading(false); // 선택 전에도 로딩 해제
      setBaselineCritique('');
      return;
    }
    const fetchBaseline = async () => {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('task', task);
        formData.append('rico_id', ricoId);
        const res = await fetch(`${API_BASE}/api/baseline/`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          setBaselineCritique('베이스라인 결과를 불러올 수 없습니다.');
        } else {
          const data = await res.json();
          console.log('baseline response:', data);
          if (typeof data.solution === 'string') {
            setBaselineCritique(data.solution);
          } else if (typeof data.raw === 'string') {
            setBaselineCritique(data.raw);
          } else {
            setBaselineCritique('결과 없음');
          }
        }
      } catch (err) {
        setBaselineCritique('베이스라인 결과를 불러오는 중 오류 발생');
      } finally {
        setLoading(false);
      }
    };
    fetchBaseline();
  }, [task, ricoId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex h-screen p-4 gap-4">
        {/* Upload Panel */}
        <div className="w-1/8 min-w-[300px]">
          <TargetPanelBaseline setTask={setTask} setRicoId={setRicoId} />
        </div>

        {/* Right: Baseline Table (flex-1) */}
        <div className="flex-1">
          {/* 항상 BaselineTable 렌더링, loading 시 안내 메시지 전달 */}
          <BaselineTable
            baselineResult={loading ? 'Loading baseline...' : (baselineCritique || '-')}
            setBaselineResult={setBaselineCritique}
            isGuidelineRevised={isGuidelineRevised}
            setIsGuidelineRevised={setIsGuidelineRevised}
          />
        </div>
      </main>
    </div>
  );
}