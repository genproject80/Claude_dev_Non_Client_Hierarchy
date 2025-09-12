import { useState, useEffect } from 'react';
import { deviceConfigApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface DeviceConfig {
  config_id: number;
  device_id: string;
  config_version: number;
  config_name: string;
  config_data: any;
  config_hash: string;
  is_active: boolean;
  is_deployed: boolean;
  deployment_status: string;
  created_at: string;
  activated_at?: string;
  notes?: string;
}

interface DeviceWithConfigStatus {
  device_id: string;
  client_id: string;
  active_config?: {
    config_id: number;
    config_name: string;
    config_version: number;
    deployment_status: string;
    activated_at: string;
  };
  total_configs: number;
  last_updated: string;
}

interface ConfigTemplate {
  template_id: number;
  template_name: string;
  description?: string;
  template_data: any;
  category: string;
  is_active: boolean;
  created_at: string;
}

export const useDeviceConfigs = () => {
  const [devices, setDevices] = useState<DeviceWithConfigStatus[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [configs, setConfigs] = useState<DeviceConfig[]>([]);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const { toast } = useToast();

  // Load devices with config status on mount
  useEffect(() => {
    loadDevices();
    loadTemplates();
  }, []);

  // Load configs when selected device changes
  useEffect(() => {
    if (selectedDevice) {
      loadConfigs(selectedDevice);
    }
  }, [selectedDevice]);

  const loadDevices = async () => {
    try {
      setDevicesLoading(true);
      const response = await deviceConfigApi.getDevicesWithConfigStatus();
      if (response.success) {
        setDevices(response.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive"
      });
    } finally {
      setDevicesLoading(false);
    }
  };

  const loadConfigs = async (deviceId: string) => {
    try {
      setLoading(true);
      const response = await deviceConfigApi.getConfigs(deviceId);
      if (response.success) {
        setConfigs(response.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load configurations for device ${deviceId}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await deviceConfigApi.getConfigTemplates();
      if (response.success) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Don't show toast for templates as they're optional
    } finally {
      setTemplatesLoading(false);
    }
  };

  const createConfig = async (deviceId: string, data: {
    config_name: string;
    config_data: any;
    notes?: string;
  }) => {
    try {
      const response = await deviceConfigApi.createConfig(deviceId, data);
      if (response.success) {
        toast({
          title: "Success",
          description: "Configuration created successfully"
        });
        await loadConfigs(deviceId);
        await loadDevices(); // Refresh device status
        return response.data;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create configuration",
        variant: "destructive"
      });
      throw error;
    }
  };

  const activateConfig = async (deviceId: string, configId: number) => {
    try {
      console.log('Frontend: Activating config', { deviceId, configId });
      const response = await deviceConfigApi.activateConfig(deviceId, configId);
      console.log('Frontend: Activation response', response);
      if (response.success) {
        toast({
          title: "Success",
          description: "Configuration activated successfully"
        });
        await loadConfigs(deviceId);
        await loadDevices(); // Refresh device status
        return response.data;
      }
    } catch (error) {
      console.error('Frontend: Activation error', error);
      toast({
        title: "Error",
        description: "Failed to activate configuration",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deployConfig = async (deviceId: string, configId: number) => {
    try {
      const response = await deviceConfigApi.deployConfig(deviceId, configId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Configuration deployment initiated"
        });
        await loadConfigs(deviceId);
        await loadDevices(); // Refresh device status
        return response.data;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deploy configuration",
        variant: "destructive"
      });
      throw error;
    }
  };

  const refreshData = async () => {
    await loadDevices();
    if (selectedDevice) {
      await loadConfigs(selectedDevice);
    }
  };

  return {
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
    refreshData,
    loadConfigs
  };
};