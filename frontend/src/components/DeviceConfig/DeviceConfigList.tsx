import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  HardDrive, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  XCircle
} from "lucide-react";
import { useState } from "react";

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

interface DeviceConfigListProps {
  devices: DeviceWithConfigStatus[];
  selectedDevice: string | null;
  onSelectDevice: (deviceId: string) => void;
  loading: boolean;
}

export const DeviceConfigList = ({ 
  devices, 
  selectedDevice, 
  onSelectDevice, 
  loading 
}: DeviceConfigListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter devices based on search term
  const filteredDevices = devices.filter(device =>
    device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.client_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (device: DeviceWithConfigStatus) => {
    if (!device.active_config) {
      return <XCircle className="h-4 w-4 text-gray-400" />;
    }

    switch (device.active_config.deployment_status) {
      case 'deployed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (device: DeviceWithConfigStatus) => {
    if (!device.active_config) {
      return <Badge variant="secondary">No Config</Badge>;
    }

    switch (device.active_config.deployment_status) {
      case 'deployed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Deployed</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{device.active_config.deployment_status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5" />
            <span>Devices</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <HardDrive className="h-5 w-5" />
          <span>Devices ({devices.length})</span>
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="space-y-1 p-4">
            {filteredDevices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No devices found matching your search" : "No devices available"}
              </div>
            ) : (
              filteredDevices.map((device) => (
                <Button
                  key={device.device_id}
                  variant={selectedDevice === device.device_id ? "default" : "ghost"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => onSelectDevice(device.device_id)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    {getStatusIcon(device)}
                    <div className="flex-1 text-left space-y-1">
                      <div className="font-medium text-sm">
                        {device.device_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Client: {device.client_id}
                      </div>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(device)}
                        <span className="text-xs text-muted-foreground">
                          {device.total_configs} config{device.total_configs !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {device.active_config && (
                        <div className="text-xs text-muted-foreground truncate">
                          Active: {device.active_config.config_name} v{device.active_config.config_version}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};