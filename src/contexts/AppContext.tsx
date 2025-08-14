"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FinalReviewItem } from '../types/critique';

interface AppContextType {
  // Target Panel 데이터
  imageUrl: string | null;
  setImageUrl: (url: string | null) => void;
  taskDescription: string;
  setTaskDescription: (description: string) => void;
  
  // Final Review 데이터
  finalReviewData: FinalReviewItem[];
  setFinalReviewData: (data: FinalReviewItem[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [finalReviewData, setFinalReviewData] = useState<FinalReviewItem[]>([]);

  return (
    <AppContext.Provider
      value={{
        imageUrl,
        setImageUrl,
        taskDescription,
        setTaskDescription,
        finalReviewData,
        setFinalReviewData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}