"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { FilePreview } from "@/components/file/FilePreview";
import type { PreviewFile } from "@/components/file/FilePreview";

const FilePreviewContext = createContext<{
  open: (file: PreviewFile) => void;
}>({ open: () => {} });

export function useFilePreview() {
  return useContext(FilePreviewContext);
}

export function FilePreviewProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<PreviewFile | null>(null);
  return (
    <FilePreviewContext.Provider value={{ open: setFile }}>
      {children}
      <FilePreview file={file} onClose={() => setFile(null)} />
    </FilePreviewContext.Provider>
  );
}
