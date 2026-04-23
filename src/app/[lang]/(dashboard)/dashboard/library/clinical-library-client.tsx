"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Search, Star, X } from "lucide-react";

type LibraryItem = {
  id: string;
  category: string | null;
  title: string | null;
  summary?: string | null;
  content_md: string | null;
  image_url: string | null;
  tags: string[] | null;
  updated_at?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
};

type Props = {
  lang: string;
  userId: string | null;
  items: LibraryItem[];
};

const mainFilters = ["전체", "경추", "요추", "어깨", "무릎", "신경계"] as const;

function getCategoryBadgeTone(item: LibraryItem) {
  const raw = `${item.category ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
  if (raw.includes("레드플래그") || raw.includes("redflag")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (raw.includes("cpg")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
  if (raw.includes("이학적검사")) {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }
  if (raw.includes("프로토콜")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function ClinicalLibraryClient({ lang, userId, items }: Props) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`rephyt:library:favorites:${userId}`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setFavorites(parsed.filter((v) => typeof v === "string"));
      }
    } catch {
      // ignore invalid localstorage payload
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`rephyt:library:favorites:${userId}`, JSON.stringify(favorites));
  }, [favorites, userId]);

  const filteredItems = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return items.filter((item) => {
      const category = item.category ?? "";
      const title = item.title ?? "";
      const content = item.content_md ?? "";
      const tags = item.tags?.join(" ") ?? "";
      const categoryOk = activeCategory === "전체" || category === activeCategory;
      const searchOk =
        !lowered ||
        title.toLowerCase().includes(lowered) ||
        content.toLowerCase().includes(lowered) ||
        (item.summary ?? "").toLowerCase().includes(lowered) ||
        category.toLowerCase().includes(lowered) ||
        tags.toLowerCase().includes(lowered);
      return categoryOk && searchOk;
    });
  }, [activeCategory, items, query]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? items.find((item) => item.id === selectedItemId) ?? null,
    [filteredItems, items, selectedItemId],
  );

  const selectedBody = useMemo(() => {
    if (!selectedItem) return { main: "", tip: "" };
    const raw =
      selectedItem.content_md ||
      (selectedItem.summary ? `## ${selectedItem.title ?? "자료"}\n\n${selectedItem.summary}` : "콘텐츠가 준비 중입니다.");
    const tipHeadingRegex = /^###\s*\[?3\.[^\n]*$/m;
    const match = raw.match(tipHeadingRegex);
    if (!match || match.index == null) return { main: raw, tip: "" };
    return {
      main: raw.slice(0, match.index).trim(),
      tip: raw.slice(match.index).trim(),
    };
  }, [selectedItem]);

  const isEmpty = items.length === 0;

  if (!isMounted) {
    return (
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">{lang === "en" ? "CPG & Clinical Library" : "CPG 및 임상 자료실"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {lang === "en"
            ? "Find practical evidence in seconds during treatment."
            : "진료 중간에도 바로 찾아보는 실무 중심 임상 근거 라이브러리"}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={lang === "en" ? "Search CPG, red flags, tests..." : "CPG, 레드 플래그, 검사법 검색"}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-300 focus:ring-4"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {mainFilters.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {isEmpty ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">데이터를 분석 중입니다. 더 많은 리포트를 작성해 주세요.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-44 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
            ))}
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => {
            const favorite = favorites.includes(item.id);
            const dateValue = item.updatedAt ?? item.updated_at ?? item.created_at ?? null;
            const dateLabel = dateValue ? new Date(dateValue).toLocaleDateString() : "-";
            const badgeTone = getCategoryBadgeTone(item);
            const previewSummary = item.summary || item.content_md || "요약 내용이 없습니다.";

            return (
              <article key={`${item.id}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeTone}`}>
                    {item.category || "분류 없음"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFavorites((prev) =>
                        prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                      )
                    }
                    className={`rounded-lg p-1.5 transition ${favorite ? "text-amber-500" : "text-slate-300 hover:text-amber-500"}`}
                    aria-label="즐겨찾기"
                  >
                    <Star className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
                  </button>
                </div>
                <h2 className="mt-3 line-clamp-2 text-base font-black text-slate-900">{item.title || "제목 없음"}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{previewSummary}</p>
                {!!item.tags?.length && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span key={`${item.id}-${tag}`} className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>업데이트 {dateLabel}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    상세 보기
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[90] flex">
          <button className="h-full flex-1 bg-black/30" onClick={() => setSelectedItemId(null)} aria-label="close overlay" />
          <aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-bold text-indigo-600">{selectedItem.category || "분류 없음"}</p>
                <h3 className="text-lg font-black text-slate-900">{selectedItem.title || "제목 없음"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedItem.image_url ? (
              <img src={selectedItem.image_url} alt={selectedItem.title || "clinical material"} className="h-48 w-full object-cover" />
            ) : null}

            <div className="prose prose-sm prose-indigo prose-slate max-w-none whitespace-pre-wrap leading-relaxed px-5 py-5 prose-headings:text-slate-900 prose-a:text-indigo-600">
              {selectedBody.main ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h3: ({ node: _node, ...props }) => (
                      <h3
                        className="my-4 text-base font-bold text-slate-800"
                        {...props}
                      />
                    ),
                    blockquote: ({ node: _node, ...props }) => (
                      <blockquote
                        className="mt-6 border-l-4 border-indigo-600 bg-indigo-50 px-4 py-3 leading-relaxed text-slate-700"
                        {...props}
                      />
                    ),
                  }}
                >
                  {selectedBody.main}
                </ReactMarkdown>
              ) : null}
              {selectedBody.tip ? (
                <div className="mt-6 rounded-r-xl border-l-4 border-indigo-600 bg-indigo-50 p-4 whitespace-pre-wrap leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h3: ({ node: _node, ...props }) => (
                        <h3
                          className="my-4 text-base font-bold text-slate-800"
                          {...props}
                        />
                      ),
                      blockquote: ({ node: _node, ...props }) => (
                        <blockquote
                          className="mt-6 border-l-4 border-indigo-600 bg-indigo-100 px-4 py-3 leading-relaxed text-slate-700"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {selectedBody.tip}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
              <button
                type="button"
                onClick={() => router.push(`/${lang}/dashboard/soap/new?libraryId=${encodeURIComponent(selectedItem.id)}`)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
              >
                <BookOpen className="h-4 w-4" />
                {lang === "en" ? "Write Report with this Guide" : "이 가이드로 리포트 작성하기"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
