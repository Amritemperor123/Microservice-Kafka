import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Download, RefreshCw } from "lucide-react";

interface PdfRecord {
  id: number;
  submissionId: number;
  fileName: string;
  submissionData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  } | null;
  createdAt: string;
}

export const PdfList = () => {
  const [pdfs, setPdfs] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPdfs();
  }, []);

  const fetchPdfs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/pdfs');
      if (!response.ok) {
        throw new Error('Failed to fetch PDFs');
      }
      const data = await response.json();
      setPdfs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PDFs');
    } finally {
      setLoading(false);
    }
  };

  const viewPdf = (pdfId: number) => {
    const pdfUrl = `http://localhost:3001/pdf/${pdfId}`;
    window.open(pdfUrl, '_blank');
  };

  const downloadPdf = async (pdfId: number, fileName: string) => {
    try {
      const response = await fetch(`http://localhost:3001/pdf/${pdfId}`);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Loading PDFs...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-red-600 mb-4">Error: {error}</div>
          <div className="text-center">
            <Button onClick={fetchPdfs} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generated Birth Certificates
            </CardTitle>
            <CardDescription>
              View and download all generated birth certificate PDFs
            </CardDescription>
          </div>
          <Button onClick={fetchPdfs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pdfs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No PDFs Generated Yet</p>
            <p className="text-sm">Submit a birth certificate application to generate your first PDF.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">{pdf.fileName}</h4>
                      {pdf.submissionData && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">
                            {pdf.submissionData.firstName} {pdf.submissionData.lastName}
                          </span>
                          <span className="mx-2">•</span>
                          <span>{pdf.submissionData.dateOfBirth}</span>
                          <span className="mx-2">•</span>
                          <Badge variant="secondary" className="text-xs">
                            {pdf.submissionData.gender}
                          </Badge>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Generated: {new Date(pdf.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewPdf(pdf.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadPdf(pdf.id, pdf.fileName)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
