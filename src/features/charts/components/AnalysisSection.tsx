import { ChevronDown, ChevronRight } from 'lucide-react';
import { type ReactNode, useCallback, useState } from 'react';

interface Props {
  title: string;
  defaultOpen?: boolean;
  storageKey: string;
  children: ReactNode;
}

function getInitialOpen(storageKey: string, defaultOpen: boolean): boolean {
  try {
    const stored = localStorage.getItem(`analysis-section-${storageKey}`);
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage unavailable
  }
  return defaultOpen;
}

export function AnalysisSection({
  title,
  defaultOpen = true,
  storageKey,
  children,
}: Props) {
  const [open, setOpen] = useState(() =>
    getInitialOpen(storageKey, defaultOpen),
  );

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`analysis-section-${storageKey}`, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, [storageKey]);

  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <section>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-base font-semibold text-foreground transition-colors hover:text-primary"
      >
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
        {title}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </section>
  );
}
