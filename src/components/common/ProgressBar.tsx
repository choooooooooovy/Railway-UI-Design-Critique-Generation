import { ProgressStep } from "../../types/critique";


const ProgressBar = ({
  steps,
  currentStep,
  onStepClick,
  setIsLoading,
  onStateChange,
  isLoading = false,
}: {
  steps: ProgressStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
  onStateChange: (state: string) => void;
  isLoading?: boolean;
}) => {
  const currentStepData = steps[currentStep];

  // 각 단계별 하위 정보 정의
  const getStepSubInfo = (stepName: string) => {
    switch (stepName) {
      case "인식":
        return ["섹션", "컴포넌트"];
      case "이해":
        return ["컴포넌트", "섹션"];
      case "평가":
        return ["디자인 가이드라인", "디자인 이슈"];
      case "최종 리뷰":
        return ["최종 리뷰"];
      default:
        return [];
    }
  };

  return (
    <div className="w-full mb-2">
      <div className="flex justify-between items-center mb-2 gap-2 opacity-100">
        {steps.map((step, index) => {
          // 한글 단계명으로 변환
          let stepNameKor = step.name;
          if (step.name === "Perception") stepNameKor = "인식";
          if (step.name === "Comprehension") stepNameKor = "이해";
          if (step.name === "Projection") stepNameKor = "평가";
          if (step.name === "Final Review") stepNameKor = "최종 리뷰";
          if (stepNameKor === "최종 리뷰") {
            return (
              <div key={index} className="flex flex-col items-center flex-[0.5]">
                <button
                  onClick={() => {
                    onStepClick(index);
                    if (typeof setIsLoading === "function") {
                      setIsLoading(false);
                    }
                  }}
                  className={`w-full px-4 py-3 rounded-lg text-base transition-colors
                    ${step.isActive ? "font-semibold bg-[#E5F2FF] text-[#2D7FF9]" : "font-normal bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif', boxShadow: 'inset 0 2px 8px 0 rgba(0,0,0,0.08)', minHeight: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={false}
                >
                  {stepNameKor}
                </button>
              </div>
            );
          }
          return (
            <div key={index} className="flex flex-col items-center flex-[1.2]">
              <button
                onClick={() => onStepClick(index)}
                className={`w-full px-4 py-3 rounded-lg text-base transition-colors ${step.isActive ? "font-semibold bg-[#E5F2FF] text-[#2D7FF9]" : "font-normal bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                style={{ fontFamily: 'IBM Plex Sans, sans-serif', boxShadow: 'inset 0 2px 8px 0 rgba(0,0,0,0.08)' }}
                disabled={isLoading}
              >
                {stepNameKor}
              </button>
              {getStepSubInfo(stepNameKor).length > 0 && (
                <div className="flex gap-2 justify-center mt-2 mb-2 w-full">
                  {getStepSubInfo(stepNameKor).map((subInfo, subIndex) => {
                    // ...existing code...
                    const stateMap: { [key: string]: string } = {
                      "섹션": "section",
                      "컴포넌트": "component",
                      "디자인 가이드라인": "heuristic",
                      "디자인 이슈": "results"
                    };
                    const subState = stateMap[subInfo] || subInfo.toLowerCase();
                    let isActiveSubStep = false;
                    let progressWidth = '0%';
                    isActiveSubStep = step.isActive && currentStepData.state === subState;
                    if (isActiveSubStep) {
                      progressWidth = '100%';
                    }
                    return (
                      <div key={subIndex} className="flex flex-col items-center flex-1">
                        <button
                          onClick={() => {
                            if (step.isActive) {
                              onStateChange(subState);
                            }
                          }}
                          className={`px-3 py-2 text-base transition-colors relative w-full text-center
                            ${isActiveSubStep ? "text-black font-semibold" : step.isActive ? "text-gray-400 hover:text-gray-900 font-normal" : "text-gray-400 font-normal"}`}
                          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                          disabled={isLoading}
                        >
                          {subInfo}
                        </button>
                        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-[#2D7FF9] transition-all duration-300"
                            style={{ width: progressWidth }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
