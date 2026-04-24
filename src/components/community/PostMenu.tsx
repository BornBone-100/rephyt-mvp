"use client";

import { useState } from "react";
import { ReportModal } from "./ReportModal";

export function PostMenu({ postId, isOwner }: { postId: string; isOwner: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-zinc-400 transition-colors hover:text-zinc-600">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="animate-in fade-in zoom-in absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-xl duration-200">
            {isOwner ? (
              <button className="w-full px-4 py-3 text-left text-sm font-medium text-red-500 hover:bg-red-50">삭제하기</button>
            ) : (
              <button
                onClick={() => {
                  setIsReportModalOpen(true);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                <span>🛡️</span> 신고하기
              </button>
            )}
          </div>
        </>
      ) : null}

      {isReportModalOpen ? <ReportModal postId={postId} onClose={() => setIsReportModalOpen(false)} /> : null}
    </div>
  );
}
