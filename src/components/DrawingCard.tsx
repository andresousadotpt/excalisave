"use client";

import Link from "next/link";

interface DrawingCardProps {
  id: string;
  name: string;
  thumbnail?: string | null;
  updatedAt: string;
  onDelete: (id: string) => void;
}

export function DrawingCard({
  id,
  name,
  thumbnail,
  updatedAt,
  onDelete,
}: DrawingCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
      <Link href={`/draw/${id}`} className="block">
        <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          )}
        </div>
      </Link>
      <div className="p-3 flex items-center justify-between">
        <div className="min-w-0">
          <Link href={`/draw/${id}`}>
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {name}
            </h3>
          </Link>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(updatedAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete(id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
          title="Delete drawing"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
