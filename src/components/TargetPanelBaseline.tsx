"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useAppContext } from "../contexts/AppContext";


// props 타입 선언 추가
interface TargetPanelBaselineProps {
  setTask: (task: string) => void;
  setRicoId: (ricoId: string) => void;
  onBaselineFetched?: (result: any) => void;
  guidelinesStr?: string;
}

export default function TargetPanelBaseline({ setTask, setRicoId, onBaselineFetched, guidelinesStr }: TargetPanelBaselineProps) {
  // 서버에서 constants API로 이미지 파일명과 설명을 받아옴
  const [imageFilename, setImageFilename] = useState("");
  const [taskDescription, setTaskDescriptionState] = useState("");
  const imageUrl = imageFilename ? `/stores/${imageFilename}` : "";

  useEffect(() => {
    const API_BASE = (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_BASE && window.location.hostname === 'localhost')
      ? 'http://34.64.194.66:8000'
      : (process.env.NEXT_PUBLIC_API_BASE || '');
    fetch(`${API_BASE}/api/constants/`)
      .then(res => res.json())
      .then(data => {
        setImageFilename(data.image_filename);
        setTaskDescriptionState(data.task_description);
        setTask(data.task_description);
        setRicoId(data.image_filename.replace(/\.jpg$/, ""));
        // 자동으로 baseline 호출
        if (data.image_filename && data.task_description) {
          const formData = new FormData();
          formData.append("task", data.task_description);
          formData.append("rico_id", data.image_filename.replace(/\.jpg$/, ""));
          if (guidelinesStr) formData.append("guidelines_str", guidelinesStr);
          fetch(`${API_BASE}/api/baseline`, {
            method: "POST",
            body: formData,
          })
            .then(res => res.json())
            .then(result => {
              if (onBaselineFetched) onBaselineFetched(result);
            });
        }
      });
  }, [setTask, setRicoId, onBaselineFetched, guidelinesStr]);

  return (
    <div className="w-full h-full bg-white rounded-lg shadow flex flex-col">
      <div className="p-6 flex flex-col flex-1 items-center overflow-hidden">
        {/* Title */}
        <div className="w-full justify-center items-center mb-4">
          <h2 className="text-white bg-[#BAC2CA] rounded-lg px-4 py-2 w-full max-w-3xl text-center" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>분석할 UI</h2>
        </div>

        {/* Content Container - added overflow-y-auto */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Description Preview Only */}
          <div className="w-full h-24 p-3 rounded-lg text-sm flex flex-col items-center justify-center space-y-1 mb-4 ">
            <span className="text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>UI의 주요 기능</span>
            <span className="font-semibold text-gray-600 text-base">{taskDescription}</span>
          </div>

          {/* Image Preview Only */}
          <div className="w-full flex flex-col items-center mb-4 border-b border-gray-200 pb-4">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt="Target UI"
                width={1080}
                height={1920}
                className="w-full h-full object-contain rounded-lg"
                style={{ maxHeight: '480px' }}
              />
            ) : (
              <div className="w-full h-[240px] flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg">
                이미지를 불러오는 중...
              </div>
            )}
          </div>

          {/* Start 버튼 제거됨. 페이지 로드 시 자동 호출됨 */}
        </div>
      </div>
    </div>
  );
}