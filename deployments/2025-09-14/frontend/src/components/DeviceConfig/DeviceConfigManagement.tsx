import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Plus, 
  RefreshCw, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  HardDrive,
  FileText,
  Activity
} from "lucide-react";
import { DeviceConfigList } from "./DeviceConfigList";
import { ConfigCurrentView } from "./ConfigCurrentView";
import { ConfigEditor } from "./ConfigEditor";
import { useDeviceConfigs } from "./hooks/useDeviceConfigs";

export const DeviceConfigManagement = () => {
  const {
    devices,
    selectedDevice,
    setSelectedDevice,
    configs,
    templates,
    loading,
    devicesLoading,
    templatesLoading,
    createConfig,
    activateConfig,
    deployConfig,
    refreshData
  } = useDeviceConfigs();

  const [showEditor, setShowEditor] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  const handleCreateConfig = () => {
    setEditingConfig(null);
    setShowEditor(true);
  };

  const handleEditConfig = (config: any) => {
    setEditingConfig(config);
    setShowEditor(true);
  };

  const handleSaveConfig = async (data: {
    config_name: string;
    config_data: any;
    notes?: string;
  }) => {
    if (!selectedDevice) return;
    
    try {
      await createConfig(selectedDevice, data);
      setShowEditor(false);
      setEditingConfig(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleActivateConfig = async (configId: number) => {
    if (!selectedDevice) return;
    
    try {
      await activateConfig(selectedDevice, configId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDeployConfig = async (configId: number) => {
    if (!selectedDevice) return;
    
    try {
      await deployConfig(selectedDevice, configId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Get statistics for the overview cards
  const totalDevices = devices.length;
  const configuredDevices = devices.filter(d => d.active_config).length;
  const pendingDeployments = devices.filter(d => 
    d.active_config && d.active_config.deployment_status === 'pending'
  ).length;
  const totalConfigurations = devices.reduce((sum, d) => sum + d.total_configs, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Device Configuration Management</h2>
          <p className="text-muted-foreground">
            Manage device configurations, deployments, and templates
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={devicesLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${devicesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {selectedDevice && (
            <Button
              onClick={handleCreateConfig}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Configuration
            </Button>
          )}
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <HardDrive className="h-4 w-4 text-blue-500" />
              <span>Total Devices</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">
              {configuredDevices} configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Configured Devices</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configuredDevices}</div>
            <p className="text-xs text-muted-foreground">
              {totalDevices > 0 ? Math.round((configuredDevices / totalDevices) * 100) : 0}% coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-orange-500" />
              <span>Pending Deployments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeployments}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting deployment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <FileText className="h-4 w-4 text-purple-500" />
              <span>Total Configurations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConfigurations}</div>
            <p className="text-xs text-muted-foreground">
              Across all devices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device List */}
        <div className="lg:col-span-1">
          <DeviceConfigList
            devices={devices}
            selectedDevice={selectedDevice}
            onSelectDevice={setSelectedDevice}
            loading={devicesLoading}
          />
        </div>

        {/* Configuration Content */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDevice ? (
            <>
              {/* Current Active Configuration */}
              <ConfigCurrentView
                deviceId={selectedDevice}
                configs={configs}
                loading={loading}
                onActivateConfig={handleActivateConfig}
                onDeployConfig={handleDeployConfig}
                onEditConfig={handleEditConfig}
              />

              {/* Configuration Editor Modal/Panel */}
              {showEditor && (
                <ConfigEditor
                  deviceId={selectedDevice}
                  config={editingConfig}
                  templates={templates}
                  templatesLoading={templatesLoading}
                  onSave={handleSaveConfig}
                  onCancel={() => {
                    setShowEditor(false);
                    setEditingConfig(null);
                  }}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Select a Device</h3>
                  <p className="text-muted-foreground">
                    Choose a device from the list to view and manage its configurations
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};