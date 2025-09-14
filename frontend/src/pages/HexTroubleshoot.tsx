import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Wrench,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader2
} from "lucide-react";
import { deviceApi, motorApi } from "@/services/api";
import { convertHexData, ConversionResult, ConversionStep, DecodedData } from "@/services/hexConversion";

interface DeviceData {
  deviceId: string;
  conversionLogicID: number;
  hexField: string;
  entryId: number;
  createdAt: string;
  name?: string;
}

export const HexTroubleshoot = () => {
  const { deviceId, entryId } = useParams();
  const navigate = useNavigate();

  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMotorDevice, setIsMotorDevice] = useState(false);
  const fetchingRef = useRef(false);

  // Detect if this is a motor device based on the URL path
  useEffect(() => {
    setIsMotorDevice(window.location.pathname.includes('/motor-device/'));
  }, []);

  useEffect(() => {
    const fetchDeviceData = async () => {
      if (!deviceId) return;

      // Prevent duplicate API calls using ref
      if (fetchingRef.current) {
        return;
      }

      if (deviceData) {
        setLoading(false);
        return;
      }

      fetchingRef.current = true;

      try {
        setLoading(true);
        setError(null);

        let deviceResponse;
        let targetData;
        let deviceDataSet = false;

        // Detect motor device directly from pathname to avoid race condition
        const isMotorDevicePath = window.location.pathname.includes('/motor-device/');

        if (isMotorDevicePath) {
          // Motor device API
          deviceResponse = await motorApi.getById(deviceId);

          if (deviceResponse.success) {
            const apiDevice = deviceResponse.data;

            if (entryId) {
              // Find specific entry from historical data
              const dataResponse = await motorApi.getData(deviceId, { limit: 100 });
              if (dataResponse.success) {
                targetData = dataResponse.data.find((item: any) => item.entryId?.toString() === entryId);
              }
            }

            if (!targetData) {
              // Use latest data from device - motor devices store latest data in latestData
              targetData = apiDevice.latestData;
            }

            if (targetData) {
              const deviceData = {
                deviceId: apiDevice.deviceId,
                conversionLogicID: 2, // Motor devices use P2 logic for SICK sensor data
                hexField: targetData.hexField || "",
                entryId: targetData.entryId || 0,
                createdAt: targetData.createdAt || targetData.timestamp || new Date().toISOString(),
                name: apiDevice.deviceId // Use deviceId as name if name not available
              };
              setDeviceData(deviceData);
              deviceDataSet = true;
            }
          }
        } else {
          // Regular IoT device API
          deviceResponse = await deviceApi.getById(deviceId);
          if (deviceResponse.success) {
            const apiDevice = deviceResponse.data;
            if (entryId) {
              // Find specific entry from historical data
              const dataResponse = await deviceApi.getData(deviceId, { limit: 100 });
              if (dataResponse.success) {
                targetData = dataResponse.data.find((item: any) => item.entryId?.toString() === entryId);
              }
            }

            if (!targetData) {
              // Use latest data from device
              targetData = apiDevice.dataPoints?.[0];
            }

            if (targetData) {
              setDeviceData({
                deviceId: apiDevice.id,
                conversionLogicID: apiDevice.conversionLogicID || 1, // IoT devices typically use P1 logic
                hexField: targetData.hexField || "",
                entryId: targetData.entryId || 0,
                createdAt: targetData.timestamp || new Date().toISOString(),
                name: apiDevice.name
              });
              deviceDataSet = true;
            }
          }
        }

        if (!deviceDataSet) {
          throw new Error("No data record found for troubleshooting");
        }

      } catch (err) {
        console.error('Error fetching device data for troubleshooting:', err);
        setError(err instanceof Error ? err.message : 'Failed to load device data');
      } finally {
        setLoading(false);
        fetchingRef.current = false; // Reset the ref when done
      }
    };

    fetchDeviceData();
  }, [deviceId, entryId, isMotorDevice]);

  // Perform hex conversion when device data is available
  useEffect(() => {
    if (deviceData) {
      const result = convertHexData(deviceData.hexField, deviceData.conversionLogicID);
      setConversionResult(result);
    }
  }, [deviceData]);

  const handleGoBack = () => {
    const basePath = isMotorDevice ? '/motor-device' : '/device';
    navigate(`${basePath}/${deviceId}`);
  };

  const getStepIcon = (step: ConversionStep, index: number, totalSteps: number) => {
    if (conversionResult?.success === false && index === totalSteps - 1) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getLogicTypeBadge = (logicType: string) => {
    switch (logicType) {
      case 'P1':
        return <Badge variant="default">P1 Logic - Fault Data</Badge>;
      case 'P2':
        return <Badge variant="secondary">P2 Logic - SICK Sensor Data</Badge>;
      default:
        return <Badge variant="outline">Unknown Logic</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading troubleshooting data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deviceData || !conversionResult) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Device
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Troubleshooting Error</h3>
            <p className="text-muted-foreground text-center">
              {error || "Unable to load hex data for troubleshooting"}
            </p>
            <Button className="mt-4" onClick={handleGoBack}>
              Return to Device Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleGoBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Device
        </Button>
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Hex Data Troubleshooting</h1>
        </div>
      </div>

      {/* Raw Data Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Raw Data Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device ID:</span>
                <span className="font-medium">{deviceData.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry ID:</span>
                <span className="font-medium">#{deviceData.entryId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="font-medium text-sm">
                  {new Date(deviceData.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Length:</span>
                <span className="font-medium">{deviceData.hexField.length} characters</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Conversion Logic:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{deviceData.conversionLogicID}</span>
                  {getLogicTypeBadge(conversionResult.logicType)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Raw Hex Data:</span>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-mono text-sm break-all leading-relaxed">
                  {deviceData.hexField || "No hex data available"}
                </p>
              </div>
            </div>
          </div>

          {/* Conversion Status */}
          <Separator className="my-4" />
          <div className="flex items-center gap-2">
            {conversionResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-medium">
              Conversion {conversionResult.success ? "Successful" : "Failed"}
            </span>
            {conversionResult.error && (
              <span className="text-red-500 text-sm ml-2">
                {conversionResult.error}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Conversion Process */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step-by-Step Conversion Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionResult.steps.map((step, index) => (
              <div key={step.step} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getStepIcon(step, index, conversionResult.steps.length)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-sm">Step {step.step}</span>
                      <span className="text-sm font-medium">{step.description}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground font-medium block mb-1">Input:</span>
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded font-mono text-xs break-all">
                          {step.input}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium block mb-1">Output:</span>
                        <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded font-mono text-xs break-all">
                          {step.output}
                        </div>
                      </div>
                    </div>

                    {step.notes && (
                      <div className="mt-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                        <strong>Notes:</strong> {step.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Final Decoded Results */}
      {conversionResult.success && Object.keys(conversionResult.decodedData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Final Decoded Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(conversionResult.decodedData).map(([key, value]) => (
                <Card key={key} className="bg-gradient-to-br from-background to-muted/20">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                      <p className="text-lg font-semibold">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};