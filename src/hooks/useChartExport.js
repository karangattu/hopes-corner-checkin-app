import { useCallback } from "react";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

export const useChartExport = () => {
  const exportToPNG = useCallback(async (elementRef, filename = "chart") => {
    if (!elementRef.current) {
      toast.error("Chart not found");
      return;
    }

    try {
      toast.loading("Generating PNG...", { id: "chart-export" });

      // Wait a brief moment to ensure the chart is fully rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(elementRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image", { id: "chart-export" });
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const timestamp = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T]/g, "-");
        link.download = `${filename}-${timestamp}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        toast.success("Chart downloaded as PNG!", { id: "chart-export" });
      });
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast.error("Failed to export chart", { id: "chart-export" });
    }
  }, []);

  return { exportToPNG };
};
