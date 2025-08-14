import { useState, useEffect } from 'react';
import {
  PerceptionSectionRow,
  PerceptionSectionGroup,
  ComprehensionSectionGroup
} from '../types/critique';
import { useUICritiqueStore } from '../stores/useUICritiqueStore';

export function usePerceptionData() {
  const setAppUIComponents = useUICritiqueStore((state) => state.setAppUIComponents);
  const [sectionData, setSectionData] = useState<PerceptionSectionRow[]>([
    {
      id: "1",
      section: "Navigation Bar",
      position: "Top",
      sizeShape: "Full width, approximately 20% of the height"
    }
  ]);

  const [componentData, setComponentData] = useState<PerceptionSectionGroup[]>([]);
  const { appUIComponents } = useUICritiqueStore();

  // Step 2 API 응답으로 받은 컴포넌트 데이터를 처리
  useEffect(() => {
    if (appUIComponents) {
      const formattedData = Object.entries(appUIComponents).map(([sectionName, components]) => ({
        section: {
          name: sectionName,
          position: components[0]?.position || '',
          sizeShape: components[0]?.size_shape || ''
        },
        components: components.map((comp, index) => ({
          id: String(index + 1),
          name: comp.name,
          position: comp.position,
          sizeShape: comp.size_shape,
          subComponents: comp.sub_components
        }))
      }));
      setComponentData(formattedData);
    }
  }, [appUIComponents]);

  // componentData가 변경될 때 zustand store에도 동기화
  useEffect(() => {
    const clonedData = JSON.parse(JSON.stringify(componentData));
    setAppUIComponents(clonedData);
    console.log('Synchronized componentData with zustand store:', clonedData); // Debugging log
  }, [componentData, setAppUIComponents]);

  // Ensure sectionData is also synchronized if needed
  useEffect(() => {
    console.log('Section data updated:', sectionData); // Debugging log
  }, [sectionData]);

  // Add missing function declarations
  const addSectionRow = () => {
    console.log('addSectionRow function is not implemented yet.');
  };

  const deleteSectionRow = (id: string) => {
    console.log('deleteSectionRow function is not implemented yet.');
  };

  const addComponentRow = (sectionIndex: number) => {
    console.log('addComponentRow function is not implemented yet.');
  };

  const deleteComponentRow = (sectionIndex: number, componentId: string) => {
    console.log('deleteComponentRow function is not implemented yet.');
  };

  return {
    sectionData,
    setSectionData,
    componentData,
    setComponentData,
    addSectionRow,
    deleteSectionRow,
    addComponentRow,
    deleteComponentRow
  };
}

export function useComprehensionData() {
  const [componentData, setComponentData] = useState<ComprehensionSectionGroup[]>([
    {
      section: {
        name: "Header",
        position: "Top",
        sizeShape: "Full width, small height, rectangular",
        visualCharacteristics: "A rectangular header with contrasting background",
        functionalCharacteristics: "Provides navigation and context for the page"
      },
      components: []
    }
  ]);

  const [sectionData, setSectionData] = useState<ComprehensionSectionGroup[]>([
    {
      section: {
        name: "Header",
        visualCharacteristics: "The header section spans the full width...",
        functionalCharacteristics: "The header serves as a navigational...",
        position: "Top",
        sizeShape: "Full width, small height, rectangular"
      },
      components: []
    }
  ]);

  // Update comprehension data with Step 3 results
  const updateComprehensionDataWithStep3 = (step3Results: Record<string, any>) => {
    const updatedData = Object.entries(step3Results).map(([sectionName, components]: [string, any[]]) => ({
      section: {
        name: sectionName,
        position: components[0]?.position || '',
        sizeShape: components[0]?.size_shape || '',
        visualCharacteristics: components[0]?.visual_characteristics || '',
        functionalCharacteristics: components[0]?.functional_characteristics || ''
      },
      components: components.map((comp: any, index: number) => ({
        id: String(index + 1),
        name: comp.name,
        position: comp.position,
        sizeShape: comp.size_shape,
        subComponents: comp.sub_components,
        visualCharacteristics: comp.visual_characteristics || '',
        functionalCharacteristics: comp.functional_characteristics || ''
      }))
    }));

    setComponentData(updatedData);
  };

  // Remove undefined functions from return object
  return {
    sectionData,
    setSectionData,
    componentData,
    setComponentData,
    updateComprehensionDataWithStep3 // Export the new function
  };
}
