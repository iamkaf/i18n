"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Project = {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
};

type ProjectIconGridProps = {
  projects: Project[];
};

function ProjectIcon({ project }: { project: Project }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-[var(--atelier-border)] bg-[var(--atelier-surface)] transition-all duration-200 hover:border-[var(--atelier-highlight)] hover:scale-105 hover:shadow-md">
        {project.icon_url ? (
          <Image
            src={project.icon_url}
            alt={`${project.name} icon`}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[var(--atelier-highlight)] to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
            {project.name.charAt(0)}
          </div>
        )}
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--atelier-text)] text-[var(--atelier-bg)] text-sm font-medium rounded-lg whitespace-nowrap z-50 pointer-events-none animate-fade-in">
          {project.name}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--atelier-text)]" />
        </div>
      )}
    </Link>
  );
}

export function ProjectIconGrid({ projects }: ProjectIconGridProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--atelier-muted)] uppercase tracking-wider mb-6">
        Projects
      </h3>
      
      <div className="flex flex-wrap gap-3">
        {projects.map((project) => (
          <ProjectIcon key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
