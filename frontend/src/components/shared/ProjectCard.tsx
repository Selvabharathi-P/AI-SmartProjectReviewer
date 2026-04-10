import Link from "next/link";
import type { Project } from "@/types";
import { statusBadgeColor } from "@/lib/utils";
import { Calendar, User } from "lucide-react";

interface Props {
  project: Project;
  href: string;
}

export default function ProjectCard({ project, href }: Props) {
  return (
    <Link href={href} className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug pr-4">{project.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusBadgeColor(project.status)}`}>
          {project.status}
        </span>
      </div>
      <p className="text-gray-500 text-xs line-clamp-2 mb-3">{project.description}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {project.technologies.slice(0, 4).map((t) => (
          <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">{t}</span>
        ))}
        {project.technologies.length > 4 && (
          <span className="text-gray-400 text-xs">+{project.technologies.length - 4}</span>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Calendar size={12} />
        {new Date(project.submitted_at).toLocaleDateString()}
      </div>
    </Link>
  );
}
