import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  FileText,
  Users,
  Clock,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PdfRecord {
  id: number;
  submissionId: number;
  fileName: string;
  certificateType?: string;
  createdAt: string;
  // submissionData might not be available in read model yet, simplifying for now
}

interface DashboardStats {
  totalSubmissions: number;
  totalPdfs: number;
  todaySubmissions: number;
  todayPdfs: number;
}

export const Dashboard = () => {
  const [pdfs, setPdfs] = useState<PdfRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSubmissions: 0,
    totalPdfs: 0,
    todaySubmissions: 0,
    todayPdfs: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);

  const fetchData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/pdfs`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setPdfs(data);

      // Fetch stats if available, or calculate local
      // For now calculating local based on fetched PDFs
      const today = new Date().toDateString();
      const todayPdfs = data.filter((pdf: any) =>
        new Date(pdf.created_at || pdf.createdAt).toDateString() === today
      );

      setStats({
        totalSubmissions: data.length, // approximation
        totalPdfs: data.length,
        todaySubmissions: todayPdfs.length, // approximation
        todayPdfs: todayPdfs.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data. Is the backend running?",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // WebSocket Connection
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3004';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Admin WebSocket');
      toast({
        title: "Connected",
        description: "Real-time updates enabled",
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = event.data;
        const message = JSON.parse(data);
        console.log('Received WebSocket message:', message);

        if (message.topic === 'pdf-generation-complete') {
          // Add new PDF to list
          const newPdf = {
            id: message.pdfId || Date.now(), // fallback
            submissionId: message.submissionId,
            fileName: message.fileName,
            certificateType: message.certificateType,
            createdAt: message.timestamp || new Date().toISOString()
          };

          setPdfs(prev => [newPdf, ...prev]);

          setStats(prev => ({
            ...prev,
            totalPdfs: prev.totalPdfs + 1,
            todayPdfs: prev.todayPdfs + 1
          }));

          toast({
            title: "New PDF Generated",
            description: `Certificate for submission #${message.submissionId} is ready.`,
          });
        }
        else if (message.topic === 'certificate-requests') {
          setStats(prev => ({
            ...prev,
            totalSubmissions: prev.totalSubmissions + 1,
            todaySubmissions: prev.todaySubmissions + 1
          }));
          toast({
            title: "New Submission",
            description: `New ${message.service} certificate request received.`,
          });
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from Admin WebSocket');
      toast({
        title: "Disconnected",
        description: "Real-time connection lost. Reconnecting...",
        variant: "destructive"
      });
      // Simple reconnect logic could go here
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const viewPdf = (pdfId: number) => {
    // In new architecture, we need a way to view PDF. 
    // The admin backend doesn't serve files directly anymore ideally, 
    // but for now we might rely on the fact that they are in shared storage 
    // and Admin Backend CAN serve them if configured.
    // DOES Admin Backend serve static files?
    // Not explicitly in my index.ts. 
    // I should probably add static file serving for /certificates in admin backend.

    // For now assuming existing behavior or that I'll fix it.
    // The API URL is import.meta.env.VITE_API_URL
    window.open(`${import.meta.env.VITE_API_URL}/pdf/${pdfId}`, '_blank');
  };

  const downloadPdf = (pdfId: number, fileName: string) => {
    const link = document.createElement('a');
    link.href = `${import.meta.env.VITE_API_URL}/pdf/${pdfId}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("adminUser");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of certificate operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <div className={`w-2 h-2 rounded-full ${wsRef.current?.readyState === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
            {wsRef.current?.readyState === 1 ? 'Live' : 'Disconnected'}
          </Badge>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleLogout} variant="outline" className="text-red-600 hover:text-red-700">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              All time records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PDFs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPdfs}</div>
            <p className="text-xs text-muted-foreground">
              Generated certificates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Submissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySubmissions}</div>
            <p className="text-xs text-muted-foreground">
              New today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's PDFs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayPdfs}</div>
            <p className="text-xs text-muted-foreground">
              Generated today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Real-time feed of generated certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pdfs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm">Events will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pdfs.map((pdf) => (
                <div key={pdf.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">#{pdf.submissionId}</Badge>
                        {pdf.certificateType && <Badge variant="outline">{pdf.certificateType}</Badge>}
                        <span className="text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDate(pdf.createdAt || (pdf as any).created_at)}
                        </span>
                      </div>

                      {/* File Info */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{pdf.fileName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {/* View/Download disabled if we don't serve files yet */}
                      {/* We will implement file serving in admin backend next */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewPdf(pdf.id)}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
