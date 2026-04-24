"use client";
import { useState } from "react";
import { useAdminUsers, useUpdateUser, useDeleteAdminUser, useDepartments } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import { Trash2, ShieldCheck, GraduationCap, Users } from "lucide-react";
import { PageLoader } from "@/components/shared/Spinner";
import type { User, Role } from "@/types";

const ROLE_LABELS: Record<Role, string> = { student: "Student", faculty: "Faculty", admin: "Admin" };
const ROLE_COLORS: Record<Role, string> = {
  student: "bg-blue-100 text-blue-700",
  faculty: "bg-purple-100 text-purple-700",
  admin: "bg-green-100 text-green-700",
};

export default function UsersPage() {
  const { data: users, isLoading } = useAdminUsers();
  const { data: departments } = useDepartments();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: deleteUser } = useDeleteAdminUser();
  const toast = useToast();
  const [search, setSearch] = useState("");

  const filtered = users?.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (user: User, role: Role) => {
    try {
      await updateUser({ id: user.id, data: { role } });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleDeptChange = async (user: User, dept_id: string) => {
    try {
      await updateUser({ id: user.id, data: { department_id: dept_id ? Number(dept_id) : null } });
      toast.success("Department updated");
    } catch {
      toast.error("Failed to update department");
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.full_name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user.id);
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Users</h1>
        <p className="text-gray-500 mt-1">Manage all registered users</p>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading && <PageLoader />}

      {!isLoading && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID No.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered?.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        {u.role === "admin" ? (
                          <ShieldCheck size={13} className="text-blue-600" />
                        ) : u.role === "faculty" ? (
                          <Users size={13} className="text-purple-600" />
                        ) : (
                          <GraduationCap size={13} className="text-blue-600" />
                        )}
                      </div>
                      <span className="font-medium text-gray-800">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400">{u.id_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_COLORS[u.role]}`}
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.department_id ?? ""}
                      onChange={(e) => handleDeptChange(u, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— None —</option>
                      {departments?.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="Delete user"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
