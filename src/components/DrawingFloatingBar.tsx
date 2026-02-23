"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

interface DrawingItem {
  id: string;
  name: string;
  thumbnail: string | null;
  projectId: string | null;
  tagIds: string[];
}

interface ProjectItem {
  id: string;
  name: string;
  color: string | null;
}

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface DrawingFloatingBarProps {
  currentDrawingId: string;
  currentDrawingName: string;
  projectName?: string | null;
  projectColor?: string | null;
  guardNavigation: (fn: () => void) => void;
}

export function DrawingFloatingBar({
  currentDrawingId,
  currentDrawingName,
  projectName,
  projectColor,
  guardNavigation,
}: DrawingFloatingBarProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState<string | null>(null);

  const tagMap = useMemo(() => {
    const map = new Map<string, TagItem>();
    tags.forEach((t) => map.set(t.id, t));
    return map;
  }, [tags]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [drawingsRes, projectsRes, tagsRes] = await Promise.all([
        fetch("/api/drawings"),
        fetch("/api/projects"),
        fetch("/api/tags"),
      ]);
      if (drawingsRes.ok) setDrawings(await drawingsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) fetchData();
  }, [expanded, fetchData]);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  const filteredDrawings = useMemo(() => {
    let result = drawings;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    }
    if (filterProject === "unassigned") {
      result = result.filter((d) => !d.projectId);
    } else if (filterProject) {
      result = result.filter((d) => d.projectId === filterProject);
    }
    return result;
  }, [drawings, search, filterProject]);

  return (
    <>
      {/* Backdrop when expanded */}
      {expanded && (
        <div className="fixed inset-0" onClick={() => setExpanded(false)} />
      )}

      <div className="relative z-10">
        {/* Expanded panel - opens upward */}
        {expanded && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[480px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Drawings</h3>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
              <input
                type="text"
                placeholder="Search drawings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>

            {/* Project filter chips */}
            {projects.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterProject(null)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    filterProject === null
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  All
                </button>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFilterProject(filterProject === p.id ? null : p.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      filterProject === p.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p.color && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    )}
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Drawing list */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                </div>
              ) : filteredDrawings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  {search.trim() || filterProject ? "No matches" : "No drawings"}
                </p>
              ) : (
                filteredDrawings.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setExpanded(false);
                      if (d.id !== currentDrawingId) {
                        guardNavigation(() => router.push(`/draw/${d.id}`));
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      d.id === currentDrawingId
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {d.thumbnail ? (
                      <img
                        src={d.thumbnail}
                        alt=""
                        className="w-12 h-7 object-cover rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-7 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className={`block truncate ${
                        d.id === currentDrawingId
                          ? "text-blue-700 dark:text-blue-300 font-medium"
                          : "text-gray-700 dark:text-gray-300"
                      }`}>
                        {d.name}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {d.projectId && (
                          <span className="text-xs text-gray-400">
                            {projects.find((p) => p.id === d.projectId)?.name}
                          </span>
                        )}
                        {d.tagIds.map((tagId) => {
                          const tag = tagMap.get(tagId);
                          if (!tag) return null;
                          return (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                            >
                              {tag.color && (
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                              )}
                              {tag.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {d.id === currentDrawingId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pill button (always visible) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 transition-colors"
        >
          {projectColor && (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: projectColor }} />
          )}
          {projectName && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{projectName} /</span>
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
            {currentDrawingName}
          </span>
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expanded ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
          </svg>
        </button>
      </div>
    </>
  );
}
