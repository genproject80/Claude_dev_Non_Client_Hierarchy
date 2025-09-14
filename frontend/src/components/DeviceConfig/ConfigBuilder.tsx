import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Copy, Check, Loader, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deviceConfigApi } from '@/services/api';

interface ConfigBuilderProps {
  deviceId: string;
  onJsonGenerated: (json: string) => void;
}

interface DeviceDetails {
  device_id: string;
  channel_id: number;
  field_id: number;
  api_key: string;
  client_id: string;
  conversion_logic_id: number;
}

interface ConfigData {
  device_id: string;
  thingspeak: {
    channel_id: number;
    api_key: string;
    field_id: number;
  };
  device_settings: {
    sampling_rate_seconds: number;
    telemetry_interval_minutes: number;
    motor_current_threshold_ma: number;
    enable_gps_tracking: boolean;
  };
  communication_settings: {
    protocol: string;
    endpoint_url: string;
    retry_attempts: number;
    timeout_seconds: number;
    batch_size: number;
  };
  custom_parameters: Record<string, any>;
}

const ConfigBuilder: React.FC<ConfigBuilderProps> = ({ deviceId, onJsonGenerated }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);
  const [copied, setCopied] = useState(false);

  const [configData, setConfigData] = useState<ConfigData>({
    device_id: deviceId,
    thingspeak: {
      channel_id: 0,
      api_key: '',
      field_id: 1
    },
    device_settings: {
      sampling_rate_seconds: 300,
      telemetry_interval_minutes: 8,
      motor_current_threshold_ma: 5000,
      enable_gps_tracking: true
    },
    communication_settings: {
      protocol: 'https',
      endpoint_url: 'https://your-endpoint.com/api/data',
      retry_attempts: 3,
      timeout_seconds: 30,
      batch_size: 100
    },
    custom_parameters: {}
  });

  const [customParamKey, setCustomParamKey] = useState('');
  const [customParamValue, setCustomParamValue] = useState('');

  // Fetch device details on mount
  useEffect(() => {
    const fetchDeviceDetails = async () => {
      console.log(`🚀 ConfigBuilder: Starting fetch for device ${deviceId}`);

      try {
        setLoading(true);
        setError(null);

        console.log('📡 ConfigBuilder: Calling deviceConfigApi.getDeviceDetails...');
        const response = await deviceConfigApi.getDeviceDetails(deviceId);

        console.log('📨 ConfigBuilder: API Response received:', {
          status: response.status,
          success: response.data?.success,
          hasData: !!response.data?.data,
          responseStructure: Object.keys(response.data || {}),
          fullResponse: response.data
        });

        // Handle both wrapped and direct response formats
        let details = null;
        if (response.data?.success && response.data?.data) {
          // Wrapped format: { success: true, data: {...} }
          details = response.data.data;
          console.log('✅ ConfigBuilder: Using wrapped response format');
        } else if (response.data && response.data.device_id) {
          // Direct format: { device_id: "P123", channel_id: 2878685, ... }
          details = response.data;
          console.log('✅ ConfigBuilder: Using direct response format');
        }

        if (details) {
          console.log('✅ ConfigBuilder: Device details received:', {
            device_id: details.device_id,
            channel_id: details.channel_id,
            field_id: details.field_id,
            api_key: details.api_key ? '***' + details.api_key?.slice(-4) : 'NULL',
            client_id: details.client_id,
            conversion_logic_id: details.conversion_logic_id
          });

          setDeviceDetails(details);

          // Auto-populate fields from device table
          const newConfigData = {
            ...configData,
            device_id: details.device_id || deviceId,
            thingspeak: {
              channel_id: details.channel_id || 0,
              api_key: details.api_key || '',
              field_id: details.field_id || 1
            }
          };

          console.log('🔄 ConfigBuilder: Setting new config data:', {
            device_id: newConfigData.device_id,
            thingspeak: {
              channel_id: newConfigData.thingspeak.channel_id,
              field_id: newConfigData.thingspeak.field_id,
              api_key: newConfigData.thingspeak.api_key ? '***' + newConfigData.thingspeak.api_key?.slice(-4) : 'NULL'
            }
          });

          setConfigData(newConfigData);
          console.log('✅ ConfigBuilder: Auto-population completed successfully');
        } else {
          console.log('❌ ConfigBuilder: No valid device data found in response');
          console.log('Response data structure:', response.data);
          setError('No device data found in response. You can still create configuration manually.');
        }
      } catch (err) {
        console.error('❌ ConfigBuilder: Failed to fetch device details:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
          stack: err.stack?.split('\n')[0]
        });
        setError(`Failed to fetch device details: ${err.message}. You can still create configuration manually.`);
      } finally {
        setLoading(false);
      }
    };

    if (deviceId) {
      console.log(`🎯 ConfigBuilder: Device ID provided: ${deviceId}`);
      fetchDeviceDetails();
    } else {
      console.log('⚠️ ConfigBuilder: No device ID provided');
    }
  }, [deviceId]);

  // Update parent whenever config changes
  useEffect(() => {
    onJsonGenerated(JSON.stringify(configData, null, 2));
  }, [configData, onJsonGenerated]);

  const updateThingSpeak = (field: string, value: any) => {
    setConfigData(prev => ({
      ...prev,
      thingspeak: {
        ...prev.thingspeak,
        [field]: value
      }
    }));
  };

  const updateDeviceSettings = (field: string, value: any) => {
    setConfigData(prev => ({
      ...prev,
      device_settings: {
        ...prev.device_settings,
        [field]: value
      }
    }));
  };

  const updateCommunicationSettings = (field: string, value: any) => {
    setConfigData(prev => ({
      ...prev,
      communication_settings: {
        ...prev.communication_settings,
        [field]: value
      }
    }));
  };

  const addCustomParameter = () => {
    if (customParamKey && customParamValue) {
      setConfigData(prev => ({
        ...prev,
        custom_parameters: {
          ...prev.custom_parameters,
          [customParamKey]: customParamValue
        }
      }));
      setCustomParamKey('');
      setCustomParamValue('');
    }
  };

  const removeCustomParameter = (key: string) => {
    setConfigData(prev => {
      const newParams = { ...prev.custom_parameters };
      delete newParams[key];
      return {
        ...prev,
        custom_parameters: newParams
      };
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(configData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading device details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">Auto-population Failed</div>
              <div>{error}</div>
              <div className="text-xs text-muted-foreground">
                Device ID: {deviceId} | Check browser console for detailed error information
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!error && deviceDetails && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <div className="space-y-1">
              <div className="font-semibold">Device data loaded successfully!</div>
              <div className="text-xs">
                Channel ID: {deviceDetails.channel_id} | Field ID: {deviceDetails.field_id} |
                API Key: {deviceDetails.api_key ? 'Configured' : 'Not configured'}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="thingspeak" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="thingspeak">ThingSpeak</TabsTrigger>
          <TabsTrigger value="device">Device Settings</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="custom">Custom Parameters</TabsTrigger>
        </TabsList>

        <TabsContent value="thingspeak">
          <Card>
            <CardHeader>
              <CardTitle>ThingSpeak Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="channel_id">Channel ID</Label>
                  <Input
                    id="channel_id"
                    type="number"
                    value={configData.thingspeak.channel_id}
                    onChange={(e) => updateThingSpeak('channel_id', parseInt(e.target.value))}
                    placeholder="e.g., 2878685"
                  />
                  {deviceDetails?.channel_id && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-populated from device: {deviceDetails.channel_id}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="field_id">Field ID</Label>
                  <Input
                    id="field_id"
                    type="number"
                    value={configData.thingspeak.field_id}
                    onChange={(e) => updateThingSpeak('field_id', parseInt(e.target.value))}
                    placeholder="e.g., 1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="text"
                  value={configData.thingspeak.api_key}
                  onChange={(e) => updateThingSpeak('api_key', e.target.value)}
                  placeholder="e.g., E8R10NT7APAB7BYT"
                />
                {deviceDetails?.api_key && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-populated from device database
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="device">
          <Card>
            <CardHeader>
              <CardTitle>Device Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sampling_rate">Sampling Rate (seconds)</Label>
                  <Input
                    id="sampling_rate"
                    type="number"
                    value={configData.device_settings.sampling_rate_seconds}
                    onChange={(e) => updateDeviceSettings('sampling_rate_seconds', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="telemetry_interval">Telemetry Interval (minutes)</Label>
                  <Input
                    id="telemetry_interval"
                    type="number"
                    value={configData.device_settings.telemetry_interval_minutes}
                    onChange={(e) => updateDeviceSettings('telemetry_interval_minutes', parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="motor_threshold">Motor Current Threshold (mA)</Label>
                <Input
                  id="motor_threshold"
                  type="number"
                  value={configData.device_settings.motor_current_threshold_ma}
                  onChange={(e) => updateDeviceSettings('motor_current_threshold_ma', parseInt(e.target.value))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="gps_tracking"
                  checked={configData.device_settings.enable_gps_tracking}
                  onCheckedChange={(checked) => updateDeviceSettings('enable_gps_tracking', checked)}
                />
                <Label htmlFor="gps_tracking">Enable GPS Tracking</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication">
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="protocol">Protocol</Label>
                <Select
                  value={configData.communication_settings.protocol}
                  onValueChange={(value) => updateCommunicationSettings('protocol', value)}
                >
                  <SelectTrigger id="protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="mqtt">MQTT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endpoint_url">Endpoint URL</Label>
                <Input
                  id="endpoint_url"
                  type="text"
                  value={configData.communication_settings.endpoint_url}
                  onChange={(e) => updateCommunicationSettings('endpoint_url', e.target.value)}
                  placeholder="https://your-endpoint.com/api/data"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="retry_attempts">Retry Attempts</Label>
                  <Input
                    id="retry_attempts"
                    type="number"
                    value={configData.communication_settings.retry_attempts}
                    onChange={(e) => updateCommunicationSettings('retry_attempts', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={configData.communication_settings.timeout_seconds}
                    onChange={(e) => updateCommunicationSettings('timeout_seconds', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="batch_size">Batch Size</Label>
                  <Input
                    id="batch_size"
                    type="number"
                    value={configData.communication_settings.batch_size}
                    onChange={(e) => updateCommunicationSettings('batch_size', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Custom Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Parameter key"
                  value={customParamKey}
                  onChange={(e) => setCustomParamKey(e.target.value)}
                />
                <Input
                  placeholder="Parameter value"
                  value={customParamValue}
                  onChange={(e) => setCustomParamValue(e.target.value)}
                />
                <Button onClick={addCustomParameter}>Add</Button>
              </div>

              {Object.entries(configData.custom_parameters).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(configData.custom_parameters).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <span className="font-mono text-sm">
                        {key}: {JSON.stringify(value)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomParameter(key)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>JSON Preview</span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy JSON
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-secondary p-4 rounded-lg overflow-auto max-h-96">
            <code className="text-sm">{JSON.stringify(configData, null, 2)}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigBuilder;