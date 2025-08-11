import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Activity, Zap, MapPin, Signal, Loader2, Settings, Gauge } from "lucide-react";
import { motorApi } from "@/services/api";
import { MotorHistoricDataTable } from "@/components/dashboard/MotorHistoricDataTable";

interface MotorDeviceData {
  deviceId: string;
  latestData: {
    entryId: number;
    gsmSignalStrength: number;
    motorOnTimeSec: number;
    motorOffTimeSec: number;
    wheelsConfigured: number;
    latitude: number;
    longitude: number;
    wheelsDetected: number;
    faultCode: number;
    motorCurrentMA: number;
    createdAt: string;
    hexField: string;
    timestamp: string;
  };
  dataPoints: any[];
}

export const MotorDeviceDetail = () => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  
  const [device, setDevice] = useState<MotorDeviceData | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMotorDeviceData = async () => {
      if (!deviceId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch motor device details and initial historical data (last 2 hours)
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        
        const [deviceResponse, dataResponse] = await Promise.all([
          motorApi.getById(deviceId),
          motorApi.getData(deviceId, { 
            limit: 100,
            startDate: twoHoursAgo.toISOString(),
            endDate: now.toISOString()
          })
        ]);

        if (deviceResponse.success) {
          setDevice(deviceResponse.data);
          setSelectedRecord(deviceResponse.data.latestData); // Set latest data as initially selected
        } else {
          setError('Failed to load motor device data');
        }

      } catch (err) {
        console.error('Error fetching motor device data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load motor device data');
      } finally {
        setLoading(false);
      }
    };

    fetchMotorDeviceData();
  }, [deviceId]);

  // Handle record selection from historic data table
  const handleRecordSelection = (record: any) => {
    setSelectedRecord(record);
  };

  // Get the data to display in the detailed section (selected record or latest device data)
  const getDisplayData = () => {
    return selectedRecord || device?.latestData;
  };

  const displayData = getDisplayData();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading motor device details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Motor Device</h2>
            <p className="text-destructive/80 mb-4">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Motor Device Not Found</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { latestData } = device;

  const getMotorStatusIcon = (data = displayData) => {
    if (data && data.motorOnTimeSec > data.motorOffTimeSec) {
      return <Activity className="h-6 w-6 text-success" />;
    }
    return <Activity className="h-6 w-6 text-muted-foreground" />;
  };

  const getFaultSeverityIcon = (faultCode: number) => {
    if (faultCode === 0) {
      return <Activity className="h-6 w-6 text-success" />;
    }
    if (faultCode > 10) {
      return <AlertTriangle className="h-6 w-6 text-destructive" />;
    }
    return <AlertTriangle className="h-6 w-6 text-warning" />;
  };

  const getMotorStatusBadge = (data = displayData) => {
    if (data && data.motorOnTimeSec > data.motorOffTimeSec) {
      return <Badge className="bg-success text-success-foreground">Running</Badge>;
    }
    return <Badge variant="secondary">Stopped</Badge>;
  };

  const getFaultBadge = (faultCode: number) => {
    if (faultCode === 0) {
      return <Badge variant="secondary" className="bg-success text-success-foreground">Normal</Badge>;
    }
    if (faultCode > 10) {
      return <Badge variant="destructive">Critical Fault</Badge>;
    }
    return <Badge variant="outline" className="border-warning text-warning">Warning</Badge>;
  };

  const getGsmStrengthBadge = (signal: number) => {
    if (signal === 0) {
      return <Badge variant="destructive">No Signal</Badge>;
    } else if (signal === 1) {
      return <Badge variant="destructive">Very Poor</Badge>;
    } else if (signal === 2) {
      return <Badge variant="outline" className="border-warning text-warning">Poor</Badge>;
    } else if (signal === 3) {
      return <Badge variant="outline" className="border-warning text-warning">Fair</Badge>;
    } else if (signal === 4) {
      return <Badge className="bg-success text-success-foreground">Good</Badge>;
    } else if (signal === 5) {
      return <Badge className="bg-success text-success-foreground">Very Good</Badge>;
    } else if (signal === 6) {
      return <Badge className="bg-success text-success-foreground">Excellent</Badge>;
    }
    return <Badge variant="destructive">Unknown</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => navigate("/?tab=motor")} 
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Motor Device {device.deviceId}</h1>
              <p className="text-muted-foreground">Detailed motor device information and diagnostics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {selectedRecord && selectedRecord.entryId !== latestData.entryId && (
              <Badge variant="secondary" className="text-xs">
                Viewing Historic Record #{selectedRecord.entryId}
              </Badge>
            )}
            <div className="flex items-center space-x-2">
              {getMotorStatusIcon()}
              {getMotorStatusBadge()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device ID:</span>
                <span className="font-medium">{device.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry ID:</span>
                <span className="font-medium">#{displayData?.entryId || latestData.entryId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Record Time:</span>
                <span className="font-medium text-sm">{new Date(displayData?.createdAt || latestData.createdAt).toLocaleString()}</span>
              </div>
              {selectedRecord && selectedRecord.entryId !== latestData.entryId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="font-medium text-sm">{new Date(displayData?.timestamp || displayData?.createdAt).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Motor Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Motor Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                {getMotorStatusBadge()}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ON Time:</span>
                <span className="font-medium">{displayData?.motorOnTimeSec || latestData.motorOnTimeSec} sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">OFF Time:</span>
                <span className="font-medium">{displayData?.motorOffTimeSec || latestData.motorOffTimeSec} sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current:</span>
                <span className="font-medium">{displayData?.motorCurrentMA || latestData.motorCurrentMA} mA</span>
              </div>
            </CardContent>
          </Card>

          {/* Communication & GPS Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signal className="h-5 w-5" />
                Communication & GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">GSM Signal:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{displayData?.gsmSignalStrength || latestData.gsmSignalStrength}</span>
                  {getGsmStrengthBadge(displayData?.gsmSignalStrength || latestData.gsmSignalStrength)}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GPS Location:</span>
                {(displayData?.latitude !== 0 || displayData?.longitude !== 0) ? (
                  <button
                    onClick={() => {
                      const lat = displayData?.latitude || latestData.latitude;
                      const lng = displayData?.longitude || latestData.longitude;
                      const url = `https://www.google.com/maps?q=${lat},${lng}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center gap-1 text-success hover:text-success/80 transition-colors cursor-pointer"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium underline">View on Maps</span>
                  </button>
                ) : (
                  <span className="text-muted-foreground text-sm">Not Available</span>
                )}
              </div>
              {((displayData?.latitude !== 0 || displayData?.longitude !== 0) || (latestData.latitude !== 0 || latestData.longitude !== 0)) && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latitude:</span>
                    <span className="font-medium">{(displayData?.latitude || latestData.latitude).toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Longitude:</span>
                    <span className="font-medium">{(displayData?.longitude || latestData.longitude).toFixed(6)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Wheel Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Wheel Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Configured:</span>
                <span className="font-medium">{displayData?.wheelsConfigured || latestData.wheelsConfigured}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Detected:</span>
                <span className="font-medium">{displayData?.wheelsDetected || latestData.wheelsDetected}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Detection Rate:</span>
                <span className="font-medium">
                  {(displayData?.wheelsConfigured || latestData.wheelsConfigured) > 0 
                    ? `${(((displayData?.wheelsDetected || latestData.wheelsDetected) / (displayData?.wheelsConfigured || latestData.wheelsConfigured)) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Fault Information Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getFaultSeverityIcon(displayData?.faultCode || latestData.faultCode)}
                  <span>Fault Information & Diagnostics</span>
                </div>
                {selectedRecord && selectedRecord.entryId !== latestData.entryId && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedRecord(latestData)}
                  >
                    View Latest Data
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(displayData?.faultCode || latestData.faultCode) > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fault Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-mono font-bold text-destructive">{displayData?.faultCode || latestData.faultCode}</span>
                      {getFaultBadge(displayData?.faultCode || latestData.faultCode)}
                    </div>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <h4 className="font-medium text-destructive mb-2">Fault Detected</h4>
                    <p className="text-sm text-destructive/80">
                      Motor device is reporting fault code {displayData?.faultCode || latestData.faultCode}. 
                      {(displayData?.faultCode || latestData.faultCode) > 10 ? ' This is a critical fault that requires immediate attention.' : ' This is a warning condition that should be monitored.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-success">No Faults Detected</h3>
                  <p className="text-muted-foreground">Motor device is operating normally</p>
                  <div className="flex gap-2 justify-center mt-4">
                    {getMotorStatusBadge()}
                    <Badge variant="outline">
                      Current: {displayData?.motorCurrentMA || latestData.motorCurrentMA}mA
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Details Card */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Technical Details & Raw Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Performance Metrics</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Motor ON Time:</span>
                      <span className="font-medium">{displayData?.motorOnTimeSec || latestData.motorOnTimeSec} seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Motor OFF Time:</span>
                      <span className="font-medium">{displayData?.motorOffTimeSec || latestData.motorOffTimeSec} seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Draw:</span>
                      <span className="font-medium">{displayData?.motorCurrentMA || latestData.motorCurrentMA} mA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duty Cycle:</span>
                      <span className="font-medium">
                        {(displayData?.motorOnTimeSec || latestData.motorOnTimeSec) + (displayData?.motorOffTimeSec || latestData.motorOffTimeSec) > 0 
                          ? `${(((displayData?.motorOnTimeSec || latestData.motorOnTimeSec) / ((displayData?.motorOnTimeSec || latestData.motorOnTimeSec) + (displayData?.motorOffTimeSec || latestData.motorOffTimeSec))) * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Raw Hex Data</h4>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="font-mono text-xs break-all">
                      {displayData?.hexField || latestData.hexField || "No hex data available"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historic Data Section */}
        <div className="mt-8">
          <MotorHistoricDataTable 
            deviceId={deviceId!} 
            historicData={device.dataPoints || []} 
            onRecordSelect={handleRecordSelection}
          />
        </div>
      </div>
    </div>
  );
};