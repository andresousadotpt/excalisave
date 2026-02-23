"use client";

import { useState, useEffect, useCallback } from "react";

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  totalDrawings: number;
  recentUsers: number;
}

interface UserEntry {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  _count: { drawings: number };
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [statsRes, usersRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/users"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      fetchData();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Verified Users" value={stats.verifiedUsers} />
          <StatCard label="Total Drawings" value={stats.totalDrawings} />
          <StatCard label="New Users (7d)" value={stats.recentUsers} />
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Verified</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Drawings</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Joined</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{user.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {user.emailVerified ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-red-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {user._count.drawings}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    {user.role !== "admin" && (
                      <>
                        {deleteConfirm === user.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
