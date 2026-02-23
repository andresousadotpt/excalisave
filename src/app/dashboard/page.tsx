"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMasterKey } from "@/hooks/useMasterKey";
import { DrawingCard } from "@/components/DrawingCard";
import { CreateDrawingDialog } from "@/components/CreateDrawingDialog";
import { DeleteDrawingDialog } from "@/components/DeleteDrawingDialog";

interface Drawing {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { isUnlocked } = useMasterKey();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchDrawings = useCallback(async () => {
    try {
      const res = await fetch("/api/drawings");
      if (res.ok) {
        setDrawings(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch drawings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  const filteredDrawings = useMemo(() => {
    if (!search.trim()) return drawings;
    const q = search.toLowerCase();
    return drawings.filter((d) => d.name.toLowerCase().includes(q));
  }, [drawings, search]);

  if (!isUnlocked) {
    return null; // UnlockModal is shown by the dashboard layout
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3">
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredDrawings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search.trim() ? "No drawings match your search" : "No drawings yet"}
          </p>
          {!search.trim() && (
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
          {filteredDrawings.map((drawing) => (
            <DrawingCard
              key={drawing.id}
              id={drawing.id}
              name={drawing.name}
              thumbnail={drawing.thumbnail}
              updatedAt={drawing.updatedAt}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <CreateDrawingDialog
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          fetchDrawings();
        }}
      />
      <DeleteDrawingDialog
        drawingId={deleteId}
        onClose={() => setDeleteId(null)}
        onDeleted={fetchDrawings}
      />
    </>
  );
}
