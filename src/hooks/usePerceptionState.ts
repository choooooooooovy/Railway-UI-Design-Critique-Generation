import { useState, useEffect } from 'react';
import { PerceptionSectionRow, PerceptionSectionGroup } from '../types/critique';
import { useUICritiqueStore } from '../stores/useUICritiqueStore';

export function usePerceptionState() {
  const appUI = useUICritiqueStore((state) => state.appUI);
  const appUIComponents = useUICritiqueStore((state) => state.appUIComponents);

  const [perceptionSectionData, setPerceptionSectionData] = useState<PerceptionSectionRow[]>([]);
  const [perceptionComponentData, setPerceptionComponentData] = useState<PerceptionSectionGroup[]>([]);

  useEffect(() => {
    if (appUI && Object.keys(appUI).length > 0) {
      const sections = Object.entries(appUI).map(([section, data], index) => ({
        id: String(index + 1),
        section: section,
        position: data.position,
        sizeShape: data.size_shape,
      }));
      setPerceptionSectionData(sections);
    }
  }, [appUI]);

  useEffect(() => {
    if (appUIComponents && appUI) {
      try {
        console.log('Raw appUIComponents:', appUIComponents); // 원본 데이터 확인

        // Step 2 결과를 섹션별로 그룹화
        const sections = new Set(Object.keys(appUI));
        const componentGroups: PerceptionSectionGroup[] = [];

        sections.forEach(sectionName => {
          const sectionInfo = appUI[sectionName] || { position: '', size_shape: '' };
          const sectionComponents = appUIComponents[sectionName] || [];
          
          // 컴포넌트 데이터가 있는지 확인
          if (sectionComponents && Object.keys(sectionComponents).length > 0) {
            const components = Object.entries(sectionComponents)
              .filter(([key]) => key !== 'visual_characteristics' && key !== 'functional_characteristics')
              .map(([componentName, componentData]: [string, any]) => ({
                id: `${sectionName}-${componentName}`,
                name: componentName,
                position: componentData.position || '',
                sizeShape: componentData.size_shape || '',
                subComponents: componentData.sub_components || '',
              }));

            if (components.length > 0) {
              componentGroups.push({
                section: {
                  name: sectionName,
                  position: sectionInfo.position,
                  sizeShape: sectionInfo.size_shape,
                },
                components,
              });
            }
          }
        });

        console.log('Processed component groups:', componentGroups); // 처리된 데이터 확인
        setPerceptionComponentData(componentGroups);
      } catch (error) {
        console.error('Error processing appUIComponents:', error);
        console.log('Debug data:', {
          appUIComponents,
          appUI
        });
      }
    }
  }, [appUIComponents, appUI]);

  const addSectionRow = () => {
    const newId = String(perceptionSectionData.length + 1);
    setPerceptionSectionData([...perceptionSectionData, { id: newId, section: "", position: "", sizeShape: "" }]);
  };

  const deleteSectionRow = (id: string) => {
    setPerceptionSectionData(perceptionSectionData.filter(row => row.id !== id));
  };

  const addComponentRow = (sectionIndex: number) => {
    const newPerceptionData = [...perceptionComponentData];
    const newId = String(Date.now());
    newPerceptionData[sectionIndex].components.push({ id: newId, name: "", position: "", sizeShape: "", subComponents: "" });
    setPerceptionComponentData(newPerceptionData);
  };

  const deleteComponentRow = (sectionIndex: number, componentId: string) => {
    const newPerceptionData = [...perceptionComponentData];
    newPerceptionData[sectionIndex].components = newPerceptionData[sectionIndex].components.filter(
      component => component.id !== componentId
    );
    setPerceptionComponentData(newPerceptionData);
  };

  return {
    perceptionSectionData,
    perceptionComponentData,
    addSectionRow,
    deleteSectionRow,
    addComponentRow,
    deleteComponentRow,
  };
}
