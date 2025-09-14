import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  Upload, 
  Edit, 
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Hash,
  Settings
} from "lucide-react";
import { format, isValid } from "date-fns";

interface DeviceConfig {
  configId: number;
  deviceId: string;
  configVersion: number;
  configName: string;
  configData: any;
  configHash: string;
  isActive: boolean;
  isDeployed: boolean;
  deploymentStatus: string;
  createdAt: string;
  activatedAt?: string;
  notes?: string;
}

interface ConfigCurrentViewProps {
  deviceId: string;
  configs: DeviceConfig[];
  loading: boolean;
  onActivateConfig: (configId: number) => void;
  onDeployConfig: (configId: number) => void;
  onEditConfig: (config: DeviceConfig) => void;
}

export const ConfigCurrentView = ({
  deviceId,
  configs,
  loading,
  onActivateConfig,
  onDeployConfig,
  onEditConfig
}: ConfigCurrentViewProps) => {
  const activeConfig = configs?.find(c => c?.isActive);
  const inactiveConfigs = configs?.filter(c => c && !c.isActive).sort((a, b) => {
    const dateA = new Date(b?.createdAt || '');
    const dateB = new Date(a?.createdAt || '');
    return (isValid(dateA) ? dateA.getTime() : 0) - (isValid(dateB) ? dateB.getTime() : 0);
  }) || [];

  const safeFormatDate = (dateString: string | undefined, formatString: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return isValid(date) ? format(date, formatString) : 'Invalid date';
  };

  const getDeploymentStatusBadge = (status: string) => {
    switch (status) {
      case 'deployed':
        return <Badge className="bg-green-100 text-green-800">Deployed</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Active Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeConfig ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{activeConfig?.configName || 'Unknown Configuration'}</h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Hash className="h-4 w-4" />
                      <span>Version {activeConfig?.configVersion || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {activeConfig?.activatedAt 
                          ? safeFormatDate(activeConfig.activatedAt, 'MMM d, yyyy HH:mm')
                          : safeFormatDate(activeConfig?.createdAt, 'MMM d, yyyy HH:mm')
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getDeploymentStatusBadge(activeConfig?.deploymentStatus || 'unknown')}
                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {activeConfig?.deploymentStatus !== 'deployed' && (
                    <Button
                      size="sm"
                      onClick={() => activeConfig?.configId && onDeployConfig(activeConfig.configId)}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Deploy
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => activeConfig && onEditConfig(activeConfig)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>

              {activeConfig?.notes && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{activeConfig.notes}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">Configuration Data Preview</h4>
                <ScrollArea className="h-32">
                  <pre className="text-xs text-muted-foreground">
                    {JSON.stringify(activeConfig?.configData || {}, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Active Configuration</h3>
              <p className="text-muted-foreground">
                This device doesn't have an active configuration. Create or activate one to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration History */}
      {inactiveConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Configuration History ({inactiveConfigs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="divide-y">
                {inactiveConfigs.map((config, index) => (
                  <div key={`config-${config?.config_id || index}-${config?.config_version || 0}-${index}`} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{config?.configName || 'Unknown Configuration'}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Hash className="h-3 w-3" />
                            <span>Version {config?.configVersion || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{safeFormatDate(config?.createdAt, 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        {config?.notes && (
                          <p className="text-xs text-muted-foreground">{config.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getDeploymentStatusBadge(config?.deploymentStatus || 'unknown')}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log('ACTIVATE BUTTON CLICKED:', { configId: config?.configId, deviceId });
                            if (config?.configId) {
                              onActivateConfig(config.configId);
                            } else {
                              console.error('Config ID is undefined!', config);
                            }
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Activate
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};