"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import Image from "next/image";



import { useEffect } from "react";
import { useAppContext } from "../contexts/AppContext";


export default function TargetPanel() {
  // 서버에서 constants API로 이미지 파일명과 설명을 받아옴
  const [imageFilename, setImageFilename] = useState("");
  const [taskDescription, setTaskDescriptionState] = useState("");
  const { setImageUrl, setTaskDescription, imageUrl: ctxImageUrl } = useAppContext();
  const [imgError, setImgError] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const displayedImageUrl =
    ctxImageUrl || (imageFilename ? `/stores/${imageFilename}` : "");

  // fetch constants and update local state, then context
  useEffect(() => {
    const API_BASE =
      typeof window !== "undefined" &&
      !process.env.NEXT_PUBLIC_API_BASE &&
      window.location.hostname === "localhost"
        ? "http://localhost:8000"
        : process.env.NEXT_PUBLIC_API_BASE || "";

    // 진단 로그
    console.log("[TargetPanel] API_BASE:", API_BASE || "(same-origin)");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); 

    fetch(`${API_BASE}/api/constants/`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`constants ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("[TargetPanel] constants:", data);
        setFetchError(null);
        if (data?.image_filename) setImageFilename(data.image_filename);
        if (data?.task_description) setTaskDescriptionState(data.task_description);
        // context에 바로 반영
        if (data?.image_filename) setImageUrl(`/stores/${data.image_filename}`);
        if (data?.task_description) setTaskDescription(data.task_description);
      })
      .catch((err) => {
        console.warn("[TargetPanel] constants fetch failed. Falling back to local image.", err);
        setFetchError("백엔드에 연결되지 않아 기본 이미지를 표시합니다.");
        // 안전한 기본값으로 폴백 (정적 파일이 확인되었으므로 사용)
        setImageFilename((prev) => prev || "67512.jpg");
        setTaskDescriptionState((prev) => prev || "Select music video to play");
        setImageUrl("/stores/67512.jpg");
        setTaskDescription("Select music video to play");
      })
      .finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  }, [setImageUrl, setTaskDescription]);

  // Step 1 API 자동 실행 (페이지 진입 시)
  useEffect(() => {
    if (!imageFilename || !taskDescription) return;
    (async () => {
      try {
        const formData = new FormData();
        formData.append("image_filename", imageFilename);
        formData.append("task", taskDescription);
        const API_BASE =
          typeof window !== "undefined" &&
          !process.env.NEXT_PUBLIC_API_BASE &&
          window.location.hostname === "localhost"
            ? "http://localhost:8000"
            : process.env.NEXT_PUBLIC_API_BASE || "";
        const res = await fetch(`${API_BASE}/api/step1/`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Step 1 API failed: ${errorText}`);
        }

        const data = await res.json();
        console.log("[TargetPanel] step1 result:", data);

        // Save to AppContext for global access (use API result if available)
        if (data.image_url) {
          setImageUrl(data.image_url);
        } else if (imageFilename) {
          setImageUrl(`/stores/${imageFilename}`);
        }
        if (data.task) {
          setTaskDescription(data.task);
        } else {
          setTaskDescription(taskDescription);
        }

        // Update UICritiqueStore for perception section rendering
        const store = require("../stores/useUICritiqueStore").useUICritiqueStore.getState();
        if (data.app_ui) {
          store.setAppUI(data.app_ui);
        }
        if (data.image_base64) {
          store.setImageBase64(data.image_base64);
        }
        if (data.task) {
          store.setTask(data.task);
        }
      } catch (error) {
        console.error("[TargetPanel] Step 1 error:", error);
      }
    })();
  }, [imageFilename, taskDescription, setImageUrl, setTaskDescription]);

  return (
    <div className="w-full h-full bg-white rounded-lg shadow flex flex-col" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
      <div className="p-6 flex flex-col flex-1 items-center overflow-hidden">
        {/* Title */}
        <div className="w-full justify-center items-center mb-4">
          <h2 className="text-white bg-[#BAC2CA] rounded-lg px-4 py-2 w-full max-w-3xl text-center" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>분석할 UI</h2>
        </div>

        {/* Content Container - added overflow-y-auto */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Description Preview Only */}
          <div className="w-full h-24 p-3 rounded-lg text-sm flex flex-col items-center justify-center space-y-1 mb-4 " style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            <span className="text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>UI의 주요 기능</span>
            <span className="font-semibold text-gray-600 text-base" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{taskDescription}</span>
          </div>

          {/* Status message */}
          {fetchError && (
            <div className="w-full mb-2 text-xs text-amber-600 text-center" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{fetchError}</div>
          )}

          {/* Image Preview Only */}
          <div className="w-full flex flex-col items-center mb-4 border-b border-gray-200 pb-4">
            {displayedImageUrl ? (
              imgError ? (
                <img
                  src={displayedImageUrl}
                  alt="Target UI"
                  style={{ maxWidth: '100%', maxHeight: '480px', borderRadius: '0.5rem', objectFit: 'contain', fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                />
              ) : (
                <Image
                  src={displayedImageUrl}
                  alt="Target UI"
                  width={1080}
                  height={1920}
                  className="w-full h-full object-contain rounded-lg"
                  style={{ maxHeight: '480px', fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                  unoptimized
                  onError={() => setImgError(true)}
                />
              )
            ) : (
              <div className="w-full h-[240px] flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
                이미지를 불러오는 중...
              </div>
            )}
          </div>

          {/* Start Button 제거됨. 페이지 진입 시 자동 시작됨 */}
        </div>
      </div>
    </div>
  );
}