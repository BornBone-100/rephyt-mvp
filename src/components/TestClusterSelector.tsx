"use client";

import React, { useState } from "react";

// 1. 부위별 근골격계 스페셜 테스트 데이터베이스
const TEST_CLUSTERS = {
  "어깨 (Shoulder)": ["Neer Test", "Hawkins-Kennedy", "Empty Can Test", "Drop Arm Test"],
  "무릎 (Knee)": ["McMurray Test", "Apley's Compression", "Thessaly Test", "Lachman Test"],
  "경추/요추 (Spine)": ["Spurling Test", "SLR Test", "Slump Test"],
} as const;

type TestClusterSelectorProps = {
  onSelectionChange?: (tests: string[]) => void;
};

export default function TestClusterSelector({ onSelectionChange }: TestClusterSelectorProps) {
  // 현재 선택된 테스트들을 저장하는 상태
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  // 태그를 클릭했을 때 실행되는 함수
  const toggleTest = (testName: string) => {
    let updatedSelection: string[] = [];
    if (selectedTests.includes(testName)) {
      updatedSelection = selectedTests.filter((t) => t !== testName); // 이미 있으면 제거
    } else {
      updatedSelection = [...selectedTests, testName]; // 없으면 추가
    }

    setSelectedTests(updatedSelection);
    // 부모 페이지로 데이터 전달
    if (onSelectionChange) {
      onSelectionChange(updatedSelection);
    }
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-gray-800">🎯 스페셜 테스트 클러스터</h3>

      <div className="space-y-6">
        {Object.entries(TEST_CLUSTERS).map(([category, tests]) => (
          <div key={category}>
            {/* 부위별 카테고리 제목 */}
            <h4 className="mb-2 text-sm font-semibold text-gray-500">{category}</h4>

            {/* 클릭 가능한 태그(Pill) 버튼들 */}
            <div className="flex flex-wrap gap-2">
              {tests.map((test) => {
                const isSelected = selectedTests.includes(test);
                return (
                  <button
                    key={test}
                    type="button"
                    onClick={() => toggleTest(test)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors duration-200 ${
                      isSelected
                        ? "border-orange-500 bg-orange-500 font-medium text-white" // 선택 시
                        : "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100" // 미선택 시
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {test}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 테스트용 결과 확인 창 (디버깅용) */}
      {selectedTests.length > 0 && (
        <div className="mt-6 rounded bg-blue-50 p-3 text-sm text-blue-800">
          <strong>현재 선택된 테스트:</strong> {selectedTests.join(", ")}
        </div>
      )}
    </div>
  );
}
