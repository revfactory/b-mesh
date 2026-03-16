import type { ReactNode } from 'react';

interface EditorLayoutProps {
  left: ReactNode;
  viewport: ReactNode;
  right: ReactNode;
}

export default function EditorLayout({ left, viewport, right }: EditorLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-[220px] p-4 overflow-y-auto space-y-6">
        {left}
      </aside>
      <main className="flex-1 relative">
        {viewport}
      </main>
      <aside className="w-[260px] p-4 overflow-y-auto space-y-6">
        {right}
      </aside>
    </div>
  );
}
