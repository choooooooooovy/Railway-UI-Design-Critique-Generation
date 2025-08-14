"use client";

import { useAppContext } from "../../contexts/AppContext";
import Image from "next/image";
import { useState } from "react";
import { FinalReviewTable } from "../../components/tables/Final/FinalReviewTable";

export default function FinalReportPage() {
  const { imageUrl, taskDescription, finalReviewData, setFinalReviewData } = useAppContext();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="p-4 border-b border-gray-200 font-bold text-xl text-center text-black bg-white">
        Final Critic Report with Criticmate
      </header>

      <main className="flex p-4 gap-4 flex-1">
        {/* Left Panel - Target UI (styled like TargetPanel) */}
        <div className="w-1/8 min-w-[300px]">
          <div className="bg-white rounded-lg shadow flex flex-col h-full">
            <div className="p-6 flex flex-col flex-1 items-center overflow-hidden">
              {/* Title */}
              <div className="w-full justify-center items-center mb-4">
                <h2 className="text-white bg-[#BAC2CA] rounded-lg px-4 py-2 w-full max-w-3xl text-center">분석할 UI</h2>
              </div>

              {/* Content Container - added overflow-y-auto */}
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto w-full">
                {/* Description Preview Only */}
                <div className="w-full h-24 p-3 rounded-lg text-sm flex flex-col items-center justify-center space-y-1 mb-4 ">
                  <span className="text-gray-600">UI의 주요 기능</span>
                  <span className="font-semibold text-gray-600 text-base">{taskDescription || "No task description"}</span>
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
                    <div className="text-center text-gray-400">
                      <div className="text-sm">No UI uploaded</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Final Review Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow p-6">
            <FinalReviewTable finalReviewData={finalReviewData} onDataChange={setFinalReviewData} />
          </div>
        </div>
      </main>
    </div>
  );
}