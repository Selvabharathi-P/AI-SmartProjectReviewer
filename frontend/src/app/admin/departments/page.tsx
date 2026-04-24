"use client";
import { useState } from "react";
import { useDepartments, useCreateDepartment, useDeleteDepartment } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import { Plus, Trash2, Building2 } from "lucide-react";
import Spinner from "@/components/shared/Spinner";

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments();
  const { mutateAsync: create, isPending: creating } = useCreateDepartment();
  const { mutateAsync: remove } = useDeleteDepartment();
  const toast = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name required"); return; }
    try {
      setError("");
      await create({ name: name.trim(), code: code.trim() || undefined });
      setName("");
      setCode("");
      toast.success("Department created");
    } catch {
      setError("Failed to create department. Name may already exist.");
    }
  };

  const handleDelete = async (id: number, deptName: string) => {
    if (!confirm(`Delete department "${deptName}"? This cannot be undone.`)) return;
    try {
      await remove(id);
      toast.success("Department deleted");
    } catch {
      toast.error("Failed to delete", "Department may have assigned users.");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Departments</h1>
        <p className="text-gray-500 mt-1">Manage departments available for registration</p>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Add Department</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Computer Science"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code (optional)</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CS"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? <Spinner size="sm" className="border-white/30 border-t-white" /> : <Plus size={16} />}
          Add Department
        </button>
      </form>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {isLoading && (
          <div className="p-6 flex justify-center">
            <Spinner />
          </div>
        )}
        {!isLoading && !departments?.length && (
          <div className="p-6 text-center text-gray-400 text-sm">
            No departments yet. Add one above.
          </div>
        )}
        {departments?.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Building2 size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{d.name}</p>
                {d.code && <p className="text-xs text-gray-400">{d.code}</p>}
              </div>
            </div>
            <button
              onClick={() => handleDelete(d.id, d.name)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              title="Delete department"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
