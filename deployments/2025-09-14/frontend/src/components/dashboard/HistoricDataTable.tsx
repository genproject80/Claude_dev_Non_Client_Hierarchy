import { Device } from "@/types/device";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Clock, Activity, Filter, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { deviceApi } from "@/services/api";

interface HistoricDataTableProps {
  deviceId: string;
  historicData: Device[];
  onRecordSelect?: (record: Device) => void;
}

export const HistoricDataTable = ({ deviceId, historicData: initialData, onRecordSelect }: HistoricDataTableProps) => {
  const [historicData, setHistoricData] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<Device | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('2h'); // Default to 2 hours
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const itemsPerPage = 10; // Server-side pagination

  // Calculate date range for filtering
  const getDateRange = (range: string) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '2h':
        startDate.setHours(now.getHours() - 2);
        break;
      case '6h':
        startDate.setHours(now.getHours() - 6);
        break;
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      default:
        return { startDate: null, endDate: null };
    }
    
    return { 
      startDate: startDate.toISOString(), 
      endDate: now.toISOString() 
    };
  };

  // Fetch filtered data from API
  const fetchFilteredData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const response = await deviceApi.getData(deviceId, {
        page: currentPage,
        limit: itemsPerPage,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      
      if (response.success) {
        const transformedData = response.data.map((point: any) => ({
          entryId: point.entryId,
          runtimeMin: point.runtimeMin,
          faultCodes: point.faultCodes || "",
          faultDescriptions: point.faultDescriptions || "",
          leadingFaultCode: point.leadingFaultCode || 0,
          leadingFaultTimeHr: point.leadingFaultTimeHr || 0,
          gensetSignal: point.gensetSignal || "Unknown",
          thermostatStatus: point.thermostatStatus || "Unknown",
          hvOutputVoltage_kV: point.hvOutputVoltage_kV || 0,
          hvSourceNo: point.hvSourceNo || 0,
          hvOutputCurrent_mA: point.hvOutputCurrent_mA || 0,
          hexField: point.hexField || "",
          createdAt: point.timestamp,
          deviceId: deviceId
        }));
        
        setHistoricData(transformedData);
        if ('pagination' in response) {
          setTotalPages(response.pagination.pages);
          setTotalRecords(response.pagination.total);
        }
      }
    } catch (error) {
      console.error('Error fetching filtered data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters by refetching data
  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when filtering
    fetchFilteredData();
  };

  // Handle record selection
  const handleRecordSelect = (record: Device) => {
    setSelectedRecord(record);
    if (onRecordSelect) {
      onRecordSelect(record);
    }
  };

  // Effects
  useEffect(() => {
    fetchFilteredData();
  }, [deviceId, currentPage, dateRange]);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, searchTerm]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Historic Data for Device {deviceId}</span>
          </div>
          <Button 
            onClick={fetchFilteredData} 
            disabled={loading}
            size="sm" 
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center pt-4">
          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Time Range:</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last 1 Hour</SelectItem>
                <SelectItem value="2h">Last 2 Hours</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="all">All Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Status:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fault">Fault Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Search Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Search:</label>
            <Input 
              placeholder="Search fault codes, descriptions..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Runtime (min)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HV Output (kV)</TableHead>
                  <TableHead>HV Current (mA)</TableHead>
                  <TableHead>Genset Signal</TableHead>
                  <TableHead>Thermostat</TableHead>
                  <TableHead>Fault Codes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicData.map((entry) => (
                  <TableRow 
                    key={entry.entryId}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedRecord?.entryId === entry.entryId ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleRecordSelect(entry)}
                  >
                    <TableCell className="font-mono text-sm">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{entry.runtimeMin}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Activity 
                          className={`h-4 w-4 ${
                            entry.faultCodes ? "text-destructive" : "text-success"
                          }`} 
                        />
                        <Badge variant={entry.faultCodes ? "destructive" : "outline"}>
                          {entry.faultCodes ? "Fault" : "Normal"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{entry.hvOutputVoltage_kV}</TableCell>
                    <TableCell>{entry.hvOutputCurrent_mA}</TableCell>
                    <TableCell>
                      <Badge variant={entry.gensetSignal === "On" ? "default" : "secondary"}>
                        {entry.gensetSignal}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.thermostatStatus === "On" ? "default" : "secondary"}>
                        {entry.thermostatStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.faultCodes || "-"}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecordSelect(entry);
                        }}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries</span>
                  <span className="text-xs">•</span>
                  <span className="text-xs">Page {currentPage} of {totalPages}</span>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (pageNum > totalPages || pageNum < 1) return null;
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {/* Show record count even when no pagination */}
            {totalPages <= 1 && totalRecords > 0 && (
              <div className="flex items-center justify-center pt-4 mt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Total: {totalRecords} entries
                </div>
              </div>
            )}
          </>
        )}
        {historicData.length === 0 && !loading && (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Historic Data</h3>
            <p className="text-muted-foreground">
              {(statusFilter !== 'all' || searchTerm)
                ? 'No entries match the current filters'
                : 'No historic entries found for this device'
              }
            </p>
            {(statusFilter !== 'all' || searchTerm) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => {
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};