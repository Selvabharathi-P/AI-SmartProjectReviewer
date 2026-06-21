"use client";
import { useState } from "react";
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteAdminUser,
  useDepartments,
  type CreateUserData,
  type UpdateUserData,
} from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import { Trash2, ShieldCheck, GraduationCap, Users, Plus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import { PageLoader } from "@/components/shared/Spinner";
import type { User, Role } from "@/types";

const ROLE_LABELS: Record<Role, string> = { student: "Student", faculty: "Faculty", admin: "Admin" };
const ROLE_COLORS: Record<Role, string> = {
  student: "bg-blue-100 text-blue-700",
  faculty: "bg-purple-100 text-purple-700",
  admin: "bg-green-100 text-green-700",
};

type StatusFilter = "all" | "active" | "inactive";

interface FormState {
  full_name: string;
  email: string;
  password: string;
  role: Role;
  department_id: string;
  id_number: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  password: "",
  role: "student",
  department_id: "",
  id_number: "",
};

export default function UsersPage() {
  const { data: users, isLoading } = useAdminUsers();
  const { data: departments } = useDepartments();
  const { mutateAsync: createUser, isPending: creating } = useCreateUser();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: deleteUser } = useDeleteAdminUser();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // modal: null = closed, "new" = create, User = edit
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const filtered = users?.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.is_active) ||
      (statusFilter === "inactive" && !u.is_active);
    return matchesSearch && matchesStatus;
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const openEdit = (u: User) => {
    setForm({
      full_name: u.full_name,
      email: u.email,
      password: "",
      role: u.role,
      department_id: u.department_id ? String(u.department_id) : "",
      id_number: u.id_number ?? "",
    });
    setEditing(u);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dept = form.department_id ? Number(form.department_id) : null;
    try {
      if (editing === "new") {
        const payload: CreateUserData = {
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
          department_id: dept,
          id_number: form.id_number,
        };
        await createUser(payload);
        toast.success("User created");
      } else if (editing) {
        const data: UpdateUserData = {
          full_name: form.full_name,
          email: form.email,
          id_number: form.id_number,
          role: form.role,
          department_id: dept,
        };
        await updateUser({ id: editing.id, data });
        toast.success("User updated");
      }
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to save user");
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUser({ id: user.id, data: { is_active: !user.is_active } });
      toast.success(user.is_active ? "User deactivated" : "User activated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Permanently delete "${user.full_name}"? This cannot be undone. Consider deactivating instead.`)) return;
    try {
      await deleteUser(user.id);
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Users</h1>
          <p className="text-gray-500 mt-1">Manage all students and staff</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add user
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-[200px] max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered?.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? "opacity-60" : ""}`}>
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
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.department ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        u.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-gray-300 hover:text-blue-500 transition-colors p-1"
                        title="Edit user"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-1 transition-colors ${
                          u.is_active ? "text-gray-300 hover:text-amber-500" : "text-gray-300 hover:text-green-600"
                        }`}
                        title={u.is_active ? "Deactivate" : "Activate"}
                      >
                        {u.is_active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        title="Delete user"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered?.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editing === "new" ? "Add user" : "Edit user"}
              </h2>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editing === "new" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ID number</label>
                <input
                  required
                  value={form.id_number}
                  onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <select
                    value={form.department_id}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— None —</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {editing === "new" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
