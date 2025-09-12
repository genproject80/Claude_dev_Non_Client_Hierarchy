import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, AlertTriangle, Activity, Zap, Loader2, Settings } from "lucide-react";
import { deviceApi } from "@/services/api";
import { HistoricDataTable } from "@/components/dashboard/HistoricDataTable";
import { ApiKeyViewer } from "@/components/admin/ApiKeyViewer";
import { Device } from "@/types/device";

export const DeviceDetail = () => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  
  const [device, setDevice] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [historicData, setHistoricData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviceData = async () => {
      if (!deviceId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch device details and initial historical data (last 2 hours)
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        
        const [deviceResponse, dataResponse] = await Promise.all([
          deviceApi.getById(deviceId),
          deviceApi.getData(deviceId, { 
            limit: 100,
            startDate: twoHoursAgo.toISOString(),
            endDate: now.toISOString()
          })
        ]);

        if (deviceResponse.success) {
          // Use the real API device data structure
          const apiDevice = deviceResponse.data;
          const latestData = apiDevice.dataPoints?.[0];
          
          const transformedDevice = {
            // Device info
            deviceId: apiDevice.id,
            name: apiDevice.name,
            channelId: apiDevice.channelId,
            clientId: apiDevice.clientId,
            apiKey: apiDevice.apiKey,
            conversionLogicID: apiDevice.conversionLogicID,
            
            // Latest data
            entryId: latestData?.entryId || 0,
            runtimeMin: latestData?.runtimeMin || 0,
            faultCodes: latestData?.faultCodes || "",
            faultDescriptions: latestData?.faultDescriptions || "",
            leadingFaultCode: latestData?.leadingFaultCode || 0,
            leadingFaultTimeHr: latestData?.leadingFaultTimeHr || 0,
            gensetSignal: latestData?.gensetSignal || "Unknown",
            thermostatStatus: latestData?.thermostatStatus || "Unknown",
            hvOutputVoltage_kV: latestData?.hvOutputVoltage_kV || 0,
            hvSourceNo: latestData?.hvSourceNo || 0,
            hvOutputCurrent_mA: latestData?.hvOutputCurrent_mA || 0,
            hexField: latestData?.hexField || "",
            createdAt: latestData?.timestamp || new Date().toISOString()
          };
          setDevice(transformedDevice);
          setSelectedRecord(transformedDevice); // Set latest data as initially selected
        }

        if (dataResponse.success) {
          // Use the real API data structure
          const transformedData = dataResponse.data.map((point: any) => ({
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
        }

      } catch (err) {
        console.error('Error fetching device data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load device data');
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceData();
  }, [deviceId]);

  // Handle record selection from historic data table
  const handleRecordSelection = (record: any) => {
    setSelectedRecord(record);
  };

  // Get the data to display in the detailed section (selected record or latest device data)
  const getDisplayData = () => {
    return selectedRecord || device;
  };

  const displayData = getDisplayData();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading device details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Device</h2>
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
          <h1 className="text-2xl font-bold mb-4">Device Not Found</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getSeverityIcon = (faultCodes: string) => {
    if (!faultCodes) {
      return <Activity className="h-6 w-6 text-success" />;
    }
    
    if (faultCodes.includes("13") || faultCodes.includes("1")) {
      return <AlertTriangle className="h-6 w-6 text-destructive" />;
    }
    
    return <Zap className="h-6 w-6 text-warning" />;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => navigate("/")} 
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Device {device.deviceId}</h1>
              <p className="text-muted-foreground">Detailed device information and diagnostics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {selectedRecord && selectedRecord.entryId !== device.entryId && (
              <Badge variant="secondary" className="text-xs">
                Viewing Historic Record #{selectedRecord.entryId}
              </Badge>
            )}
            <div className="flex items-center space-x-2">
              {getSeverityIcon(displayData.faultCodes)}
              <Badge variant={displayData.faultCodes ? "destructive" : "outline"}>
                {displayData.faultCodes ? "Fault Detected" : "Normal Operation"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device ID:</span>
                <span className="font-medium">{device.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channel ID:</span>
                <span className="font-medium">{device.channelId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client ID:</span>
                <span className="font-medium">{device.clientId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conversion Logic:</span>
                <span className="font-medium">{device.conversionLogicID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Record Time:</span>
                <span className="font-medium text-sm">{new Date(displayData.createdAt).toLocaleString()}</span>
              </div>
              {selectedRecord && selectedRecord.entryId !== device.entryId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry ID:</span>
                  <span className="font-medium">#{displayData.entryId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Operational Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Operational Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Runtime:</span>
                <span className="font-medium">{displayData.runtimeMin} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Genset Signal:</span>
                <Badge variant={displayData.gensetSignal === "On" ? "default" : "secondary"}>
                  {displayData.gensetSignal}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thermostat:</span>
                <Badge variant={displayData.thermostatStatus === "On" ? "default" : "secondary"}>
                  {displayData.thermostatStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry ID:</span>
                <span className="font-medium">#{displayData.entryId}</span>
              </div>
            </CardContent>
          </Card>

          {/* Electrical Parameters Card */}
          <Card>
            <CardHeader>
              <CardTitle>Electrical Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">HV Output Voltage:</span>
                <span className="font-medium">{displayData.hvOutputVoltage_kV} kV</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HV Output Current:</span>
                <span className="font-medium">{displayData.hvOutputCurrent_mA} mA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HV Source No:</span>
                <span className="font-medium">{displayData.hvSourceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Power Status:</span>
                <Badge variant={displayData.hvOutputVoltage_kV > 0 ? "default" : "secondary"}>
                  {displayData.hvOutputVoltage_kV > 0 ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Fault Information Card */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(displayData.faultCodes)}
                  <span>Fault Information & Diagnostics</span>
                </div>
                {selectedRecord && selectedRecord.entryId !== device.entryId && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedRecord(device)}
                  >
                    View Latest Data
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayData.faultCodes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Active Fault Codes:</label>
                      <p className="text-lg font-mono bg-destructive/10 p-2 rounded">{displayData.faultCodes}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Leading Fault Code:</label>
                      <p className="text-lg font-semibold text-destructive">{displayData.leadingFaultCode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Leading Fault Duration:</label>
                      <p className="text-lg">{displayData.leadingFaultTimeHr} hours</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fault Descriptions:</label>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg min-h-[100px]">{displayData.faultDescriptions || "No detailed fault description available"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">System Status:</label>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={displayData.gensetSignal === "On" ? "default" : "secondary"}>
                          Genset: {displayData.gensetSignal}
                        </Badge>
                        <Badge variant={displayData.thermostatStatus === "On" ? "default" : "secondary"}>
                          Thermostat: {displayData.thermostatStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-success">No Faults Detected</h3>
                  <p className="text-muted-foreground">Device is operating normally</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Badge variant="outline">
                      Genset: {displayData.gensetSignal}
                    </Badge>
                    <Badge variant="outline">
                      Thermostat: {displayData.thermostatStatus}
                    </Badge>
                    <Badge variant="outline">
                      Runtime: {displayData.runtimeMin}min
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
                  <h4 className="font-medium text-sm">Device Configuration</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">API Key:</span>
                      <span className="font-mono text-xs">{device.apiKey || "Not configured"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry ID:</span>
                      <span className="font-medium">#{displayData.entryId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Channel ID:</span>
                      <span className="font-medium">{device.channelId}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Raw Hex Data</h4>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="font-mono text-xs break-all">
                      {displayData.hexField || "No hex data available"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content Section */}
        <div className="mt-8">
          <Tabs defaultValue="historic-data" className="w-full">
            <TabsList>
              <TabsTrigger value="historic-data" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Historic Data
              </TabsTrigger>
              <TabsTrigger value="configuration" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration & Security
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="historic-data" className="mt-6">
              <HistoricDataTable 
                deviceId={deviceId!} 
                historicData={historicData} 
                onRecordSelect={handleRecordSelection}
              />
            </TabsContent>
            
            <TabsContent value="configuration" className="mt-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* API Key Management */}
                <ApiKeyViewer 
                  deviceId={deviceId!}
                  onApiKeyRegenerated={(newKey) => {
                    console.log('API key regenerated:', newKey);
                    // Could update device state here if needed
                  }}
                />
                
                {/* Device Configuration Card - Placeholder for future features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Device Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Configuration Version:</span>
                        <Badge variant="outline">v1.0.0</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span className="text-sm">Not configured</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="secondary">Default</Badge>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Device configuration management will be available in Phase 5 implementation.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};