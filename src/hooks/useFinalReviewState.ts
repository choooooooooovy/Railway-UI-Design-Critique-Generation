import { useState, useEffect } from 'react';
import { FinalReviewItem } from '../types/critique';
import { useUICritiqueStore } from '../stores/useUICritiqueStore';
import { useAppContext } from '../contexts/AppContext';

export function useFinalReviewState() {
  const { step7Result } = useUICritiqueStore();
  const { finalReviewData: globalFinalReviewData } = useAppContext();
  const [initialData, setInitialData] = useState<FinalReviewItem[]>([]);

  useEffect(() => {
    if (step7Result) {
      const formattedData = Object.entries(step7Result).flatMap(([categoryName, categoryData]: [string, any]) => {
        if (!categoryData) return [];
        if (Array.isArray(categoryData.individual_fixes)) {
          return categoryData.individual_fixes.map((fix: any, index: number) => ({
            id: `${categoryName}-${index}`,
            title: categoryName,
            description: categoryData.root_cause,
            component: fix.component,
            expectedStandard: fix.final_solution?.expected_standard,
            identifiedGap: fix.final_solution?.identified_gap,
            proposeFix: fix.final_solution?.proposed_fix,
          }));
        } else {
          // 포맷팅: individual_fixes가 없으면 summary/info로 보여주기
          return [{
            id: `${categoryName}-summary`,
            title: categoryName,
            description: typeof categoryData === 'string' ? categoryData : JSON.stringify(categoryData, null, 2),
          }];
        }
      });
      setInitialData(formattedData);
    }
  }, [step7Result]);

  // 글로벌 상태에 최종 수정본이 있으면 그 값을 반환, 없으면 마지막 수정본(initialData) 반환
  return {
    finalReviewData:
      globalFinalReviewData && globalFinalReviewData.length > 0
        ? globalFinalReviewData
        : initialData
  };
}