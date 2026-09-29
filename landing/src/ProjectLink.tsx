import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Project } from "./projects";

export function ProjectLink({ project }: { project: Project }) {
  const { name, description, path, icon: ProjectIcon } = project;

  return (
    <a
      href={path}
      className="group -mx-4 flex items-start gap-4 rounded-xl px-4 py-4 transition-colors duration-150 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <ProjectIcon aria-hidden size={24} className="mt-0.5 shrink-0 text-ink-muted transition-colors duration-150 group-hover:text-accent" />
      <span className="min-w-0 flex-1">
        <span className="block text-2xl/snug text-ink text-balance">{name}</span>
        <span className="mt-1 block text-lg/normal text-ink-muted text-pretty">{description}</span>
      </span>
      <ArrowRight
        aria-hidden
        size={20}
        className="mt-1 shrink-0 text-ink-muted transition-[translate,color] duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </a>
  );
}
