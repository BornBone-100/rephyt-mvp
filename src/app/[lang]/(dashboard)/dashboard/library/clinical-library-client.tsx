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
  content_md: string | null;
  image_url: string | null;
  tags: string[] | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type Props = {
  lang: string;
  userId: string | null;
  items: LibraryItem[];
};

const baseCategories = ["전체", "경추", "요추", "어깨", "레드플래그", "CPG", "이학적검사", "프로토콜"];

export default function ClinicalLibraryClient({ lang, userId, items }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

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

  const categories = useMemo(() => {
    const fromData = items
      .map((item) => item.category?.trim())
      .filter((v): v is string => Boolean(v));
    return [...new Set([...baseCategories, ...fromData])];
  }, [items]);

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
        category.toLowerCase().includes(lowered) ||
        tags.toLowerCase().includes(lowered);
      return categoryOk && searchOk;
    });
  }, [activeCategory, items, query]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? items.find((item) => item.id === selectedItemId) ?? null,
    [filteredItems, items, selectedItemId],
  );

  const isEmpty = items.length === 0;

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
            {categories.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
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
          {filteredItems.map((item) => {
            const favorite = favorites.includes(item.id);
            const dateValue = item.updated_at ?? item.created_at ?? null;
            const dateLabel = dateValue ? new Date(dateValue).toLocaleDateString() : "-";

            return (
              <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
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
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.content_md || "요약 내용이 없습니다."}</p>
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

            <div className="prose prose-slate max-w-none px-5 py-5 prose-headings:text-slate-900 prose-a:text-indigo-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedItem.content_md || "콘텐츠가 준비 중입니다."}
              </ReactMarkdown>
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
