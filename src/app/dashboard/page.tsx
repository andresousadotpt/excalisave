"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMasterKey } from "@/hooks/useMasterKey";
import { DrawingCard } from "@/components/DrawingCard";
import { CreateDrawingDialog } from "@/components/CreateDrawingDialog";
import { DeleteDrawingDialog } from "@/components/DeleteDrawingDialog";
import { ManageProjectsDialog } from "@/components/ManageProjectsDialog";
import { ManageTagsDialog } from "@/components/ManageTagsDialog";

interface Drawing {
  id: string;
  name: string;
  thumbnail: string | null;
  projectId: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  color: string | null;
  drawingCount: number;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
  drawingCount: number;
}

export default function DashboardPage() {
  const { isUnlocked } = useMasterKey();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>(null); // null=all, "unassigned"=no project, or project id
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showManageProjects, setShowManageProjects] = useState(false);
  const [showManageTags, setShowManageTags] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [drawingsRes, projectsRes, tagsRes] = await Promise.all([
        fetch("/api/drawings"),
        fetch("/api/projects"),
        fetch("/api/tags"),
      ]);
      if (drawingsRes.ok) setDrawings(await drawingsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }, []);

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    if (res.ok) setTags(await res.json());
  }, []);

  // Build a tag lookup map
  const tagMap = useMemo(() => {
    const map = new Map<string, Tag>();
    tags.forEach((t) => map.set(t.id, t));
    return map;
  }, [tags]);

  // Build a project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const filteredDrawings = useMemo(() => {
    let result = drawings;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    }

    // Project filter
    if (selectedProject === "unassigned") {
      result = result.filter((d) => !d.projectId);
    } else if (selectedProject) {
      result = result.filter((d) => d.projectId === selectedProject);
    }

    // Tag filter (OR logic)
    if (selectedTags.length > 0) {
      result = result.filter((d) =>
        selectedTags.some((tagId) => d.tagIds.includes(tagId))
      );
    }

    return result;
  }, [drawings, search, selectedProject, selectedTags]);

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  if (!isUnlocked) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-shrink-0">My Drawings</h1>
        <input
          type="text"
          placeholder="Search drawings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-shrink-0"
        >
          + New Drawing
        </button>
      </div>

      {/* Project filter tabs + management buttons */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Projects:</span>
        <button
          onClick={() => setSelectedProject(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedProject === null
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedProject("unassigned")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedProject === "unassigned"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Unassigned
        </button>
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedProject === project.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {project.color && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            )}
            {project.name}
          </button>
        ))}
        <button
          onClick={() => setShowManageProjects(true)}
          className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          Manage
        </button>
      </div>

      {/* Tag filter chips */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Tags:</span>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag.id)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {tag.color && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
              )}
              {tag.name}
            </button>
          ))}
          <button
            onClick={() => setShowManageTags(true)}
            className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            Manage
          </button>
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* No tags yet - show manage button */}
      {tags.length === 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tags:</span>
          <button
            onClick={() => setShowManageTags(true)}
            className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            Manage Tags
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredDrawings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search.trim() || selectedProject || selectedTags.length > 0
              ? "No drawings match your filters"
              : "No drawings yet"}
          </p>
          {!search.trim() && !selectedProject && selectedTags.length === 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Create your first drawing
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDrawings.map((drawing) => {
            const project = drawing.projectId ? projectMap.get(drawing.projectId) : undefined;
            const drawingTags = drawing.tagIds
              .map((id) => tagMap.get(id))
              .filter((t): t is Tag => !!t)
              .map((t) => ({ id: t.id, name: t.name, color: t.color }));

            return (
              <DrawingCard
                key={drawing.id}
                id={drawing.id}
                name={drawing.name}
                thumbnail={drawing.thumbnail}
                updatedAt={drawing.updatedAt}
                projectName={project?.name}
                projectColor={project?.color}
                tags={drawingTags}
                onDelete={setDeleteId}
              />
            );
          })}
        </div>
      )}

      <CreateDrawingDialog
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          fetchData();
        }}
        projects={projects}
      />
      <DeleteDrawingDialog
        drawingId={deleteId}
        onClose={() => setDeleteId(null)}
        onDeleted={fetchData}
      />
      <ManageProjectsDialog
        open={showManageProjects}
        projects={projects}
        onClose={() => setShowManageProjects(false)}
        onUpdated={() => { fetchProjects(); fetchData(); }}
      />
      <ManageTagsDialog
        open={showManageTags}
        tags={tags}
        onClose={() => setShowManageTags(false)}
        onUpdated={() => { fetchTags(); fetchData(); }}
      />
    </>
  );
}
