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
  banned: boolean;
  pendingInvite: boolean;
  createdAt: string;
  _count: { drawings: number };
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [togglingRegistration, setTogglingRegistration] = useState(false);

  const fetchData = useCallback(async () => {
    const [statsRes, usersRes, settingsRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/users"),
      fetch("/api/admin/settings"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      setRegistrationEnabled(settings.registration_enabled === "true");
    }
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

  async function handleBan(id: string, banned: boolean) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned }),
    });
    if (res.ok) fetchData();
  }

  async function handleToggleRegistration() {
    setTogglingRegistration(true);
    const newValue = !registrationEnabled;
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_enabled: newValue ? "true" : "false" }),
    });
    if (res.ok) setRegistrationEnabled(newValue);
    setTogglingRegistration(false);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: createEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      setShowCreate(false);
      setCreateEmail("");
      fetchData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreateLoading(false);
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Verified Users" value={stats.verifiedUsers} />
          <StatCard label="Total Drawings" value={stats.totalDrawings} />
          <StatCard label="New Users (7d)" value={stats.recentUsers} />
        </div>
      )}

      {/* Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {registrationEnabled ? "New users can register" : "Registration is closed"}
            </p>
          </div>
          <button
            onClick={handleToggleRegistration}
            disabled={togglingRegistration}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              registrationEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                registrationEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Users</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Invite User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Email</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Role</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Drawings</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Joined</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{user.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {user.banned ? (
                      <span className="text-red-500 text-xs font-medium">Banned</span>
                    ) : user.pendingInvite ? (
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Invited</span>
                    ) : !user.emailVerified ? (
                      <span className="text-yellow-600 dark:text-yellow-400 text-xs font-medium">Unverified</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    {user._count.drawings}
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    {user.role !== "admin" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBan(user.id, !user.banned)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            user.banned
                              ? "text-green-600 hover:text-green-700 dark:text-green-400"
                              : "text-yellow-600 hover:text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          {user.banned ? "Unban" : "Ban"}
                        </button>
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
                              className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
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
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Invite User
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              An invite email will be sent so they can set their own password.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                autoFocus
              />
              {createError && <p className="text-red-500 text-sm">{createError}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setCreateError("");
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createLoading ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
