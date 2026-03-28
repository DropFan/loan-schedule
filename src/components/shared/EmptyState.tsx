interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center p-8 text-muted text-sm">
      {message}
    </div>
  );
}
