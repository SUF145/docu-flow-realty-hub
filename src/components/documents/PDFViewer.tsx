import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PDFViewerProps {
  fileUrl: string;
}

export const PDFViewer = ({ fileUrl }: PDFViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset loading state when fileUrl changes
    setIsLoading(true);
  }, [fileUrl]);

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      <iframe
        src={fileUrl}
        className="w-full h-full border-0"
        onLoad={() => setIsLoading(false)}
        title="PDF Viewer"
      />
    </div>
  );
};
