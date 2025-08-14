import { useState, useEffect } from 'react';
import { ComprehensionSectionGroup, TableType } from '../types/critique';
import { useUICritiqueStore } from '../stores/useUICritiqueStore';

export function useComprehensionState() {
  // User edit flag
  const [isUserEdited, setIsUserEdited] = useState(false);
  const [comprehensionState, setComprehensionState] = useState<TableType>("component");
  const { step3Results, step4Results, appUIComponents, appUI } = useUICritiqueStore(); 

  const [comprehensionComponentData, setComprehensionComponentData] = useState<ComprehensionSectionGroup[]>([]);
  const [comprehensionSectionData, setComprehensionSectionData] = useState<ComprehensionSectionGroup[]>([]);

  // Step 3와 Step 4의 결과를 함께 처리하는 통합 useEffect
  useEffect(() => {
    // Step 3의 결과를 처리하여 Component 데이터를 만듭니다.
    if (step3Results && Object.keys(step3Results).length > 0 && appUIComponents) {
      console.log('Step 3 결과로 comprehension 데이터 업데이트:', step3Results);

      const componentGroups: ComprehensionSectionGroup[] = Object.entries(step3Results).map(([sectionName, sectionData]: [string, any]) => {
        const step2Section = appUIComponents[sectionName];
        const step1Section = appUI ? appUI[sectionName] : null; // Step 1의 섹션 정보 가져오기

        const components = Object.entries(sectionData || {}).map(([componentName, componentInfo]: [string, any]) => {
          const step2Component = step2Section ? step2Section[componentName] : null;
          return {
            name: componentName,
            position: step2Component?.position || componentInfo?.position || "Unknown",
            sizeShape: step2Component?.size_shape || componentInfo?.size_shape || "Unknown",
            visualCharacteristics: componentInfo?.visual_characteristics || "No visual characteristics available",
            functionalCharacteristics: componentInfo?.functional_characteristics || "No functional characteristics available",
            subComponents: step2Component?.sub_components || componentInfo?.sub_components || "None"
          };
        });
        return {
          section: {
            name: sectionName,
            position: step1Section?.position || "Unknown",
            sizeShape: step1Section?.size_shape || "Unknown",
            visualCharacteristics: "",
            functionalCharacteristics: ""
          },
          components
        };
      });

      if (componentGroups.length > 0) {
        setComprehensionComponentData(componentGroups);

        // step4Results가 있으면 항상 comprehensionSectionData에 반영
        if (step4Results && Object.keys(step4Results).length > 0) {
          console.log('Step 4 결과로 comprehension section 데이터 업데이트 (통합):', step4Results);
          const componentDataMap = new Map<string, any[]>();
          componentGroups.forEach(group => {
            if (group.components) {
              componentDataMap.set(group.section.name, group.components);
            }
          });
          const sectionGroups: ComprehensionSectionGroup[] = Object.entries(step4Results).map(([sectionName, sectionInfo]: [string, any]) => {
            const step1Section = appUI ? appUI[sectionName] : null; // Step 1의 섹션 정보 가져오기
            return {
              section: {
                name: sectionName,
                position: step1Section?.position || sectionInfo?.position || "Unknown",
                sizeShape: step1Section?.size_shape || sectionInfo?.size_shape || "Unknown",
                visualCharacteristics: sectionInfo?.visual_characteristics || "No visual characteristics available",
                functionalCharacteristics: sectionInfo?.functional_characteristics || "No functional characteristics available"
              },
              components: componentDataMap.get(sectionName) || [] 
            };
          });
          if (sectionGroups.length > 0) {
            setComprehensionSectionData(sectionGroups);
          }
        }
      }
    }
  // step3Results, step4Results, appUIComponents, appUI, isUserEdited가 변경될 때마다 이 로직을 실행합니다.
  }, [step3Results, step4Results, appUIComponents, appUI, isUserEdited]);


  return {
    comprehensionState,
    setComprehensionState,
    comprehensionComponentData,
    setComprehensionComponentData,
    comprehensionSectionData,
    setComprehensionSectionData,
    isUserEdited,
    setIsUserEdited
  };
}
