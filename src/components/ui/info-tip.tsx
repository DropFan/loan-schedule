import { Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface InfoTipProps {
  content: string;
}

export function InfoTip({ content }: InfoTipProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!pinned) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPinned(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [pinned]);

  return (
    <TooltipProvider>
      <Tooltip open={pinned || hovered}>
        <TooltipTrigger
          ref={ref}
          className="cursor-help inline-flex"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPinned((v) => !v);
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Info className="w-3 h-3 text-muted-foreground/50" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
