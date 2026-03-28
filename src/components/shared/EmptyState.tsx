interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
      {message}
    </div>
  );
}
