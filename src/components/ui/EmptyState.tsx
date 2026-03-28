import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 max-w-lg mx-auto">
      <div className="rounded-full bg-blue-50 p-4 mb-4 text-brand-primary">
        <Icon className="h-10 w-10" strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 font-display">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 text-pretty">{description}</p>
      {action && (
        <Link
          href={action.href}
          className={cn(buttonVariants(), "mt-6 inline-flex")}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
