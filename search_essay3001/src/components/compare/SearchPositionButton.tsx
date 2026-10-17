'use client';

import { Button } from '@/components/ui/Button';
import { SearchCode } from 'lucide-react';

interface SearchPositionButtonProps {
  onClick: () => void;
}

export function SearchPositionButton({ onClick }: SearchPositionButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-30">
      <Button
        variant="primary"
        size="lg"
        onClick={onClick}
        className="rounded-full shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 !px-5"
      >
        <SearchCode className="h-4 w-4 mr-2" />
        搜索位置
      </Button>
    </div>
  );
}
