import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, History, AlertTriangle, CheckCircle, Save, Play, Trash2, Users, Plus, Settings, ChevronDown, ChevronUp, X } from 'lucide-react';
import { adminApi } from '@/services/api';

// Helper function to get authentication headers
const getAuthHeaders = () => {
    const token = sessionStorage.getItem('auth_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

interface CommunicationSettings {
    protocol: 'http' | 'https';
    base_url: string;
    function_code?: string;
    endpoint_url?: string; // For backward compatibility
    retry_attempts: number;
    [key: string]: any; // Allow additional dynamic fields
}

interface JsonField {
    id: string;
    name: string;
    value: string;
}

interface CurrentConfig {
    config_id: number;
    config_name: string;
    communication_settings: { communication_settings: CommunicationSettings };
    config_hash: string;
    is_active: boolean;
    created_by: string;
    created_at: string;
    activated_at: string;
    notes: string;
}

interface HistoryItem {
    audit_id: number;
    config_id: number;
    action: string;
    previous_endpoint: string | null;
    new_endpoint: string | null;
    changed_by: string;
    changed_by_name: string;
    changed_at: string;
    is_current: boolean;
}

interface ConfigurationTemplate {
    config_id: number;
    configuration_name: string;
    communication_settings: CommunicationSettings;
    config_hash: string;
    is_active: boolean;
    is_template: boolean;
    allowed_users: number[];
    allowed_user_names: string[];
    allowed_user_emails: string[];
    created_by: number;
    created_by_username: string;
    created_by_email: string;
    created_at: string;
    notes: string;
}

interface User {
    id: number;
    user_name: string;
    email: string;
    first_name: string;
    last_name: string;
}

interface SaveTemplateData {
    configuration_name: string;
    description: string;
    allowed_users: number[];
    notes: string;
}

export const UniversalCommunicationConfig: React.FC = () => {
    const [settings, setSettings] = useState<CommunicationSettings>({
        protocol: 'http',
        base_url: '',
        function_code: '',
        retry_attempts: 3
    });
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [currentConfig, setCurrentConfig] = useState<CurrentConfig | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    
    // New state for template management
    const [templates, setTemplates] = useState<ConfigurationTemplate[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [showSavedConfigs, setShowSavedConfigs] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveData, setSaveData] = useState<SaveTemplateData>({
        configuration_name: '',
        description: '',
        allowed_users: [],
        notes: ''
    });
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    
    // JSON Builder state
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [showStandardSettings, setShowStandardSettings] = useState(true);
    const [customJsonFields, setCustomJsonFields] = useState<JsonField[]>([]);
    const [isJsonBuilderMode, setIsJsonBuilderMode] = useState(false);
    const [jsonPreview, setJsonPreview] = useState<string>('{}');
    
    const { toast } = useToast();

    useEffect(() => {
        fetchCurrentConfig();
        fetchHistory();
        fetchTemplates();
        fetchUsers();
    }, []);

    const fetchCurrentConfig = async () => {
        try {
            setIsFetching(true);
            const data = await adminApi.universalCommunication.getCurrentConfig();
            if (data) {
                setCurrentConfig(data);
                if (data.communication_settings?.communication_settings) {
                    const existingSettings = data.communication_settings.communication_settings;
                    
                    // Handle backward compatibility - parse existing endpoint_url if present
                    if (existingSettings.endpoint_url && !existingSettings.base_url) {
                        const urlParts = parseEndpointUrl(existingSettings.endpoint_url);
                        setSettings({
                            protocol: urlParts.protocol,
                            base_url: urlParts.base_url,
                            function_code: urlParts.function_code,
                            retry_attempts: existingSettings.retry_attempts || 3
                        });
                    } else {
                        setSettings({
                            protocol: existingSettings.protocol || 'http',
                            base_url: existingSettings.base_url || '',
                            function_code: existingSettings.function_code || '',
                            retry_attempts: existingSettings.retry_attempts || 3
                        });
                    }
                }
            } else {
                // No active configuration found - use defaults
                console.log('No active configuration found, using defaults');
            }
        } catch (error) {
            console.error('Failed to fetch current config:', error);
            toast({
                title: "Error",
                description: "Failed to fetch current configuration",
                variant: "destructive"
            });
        } finally {
            setIsFetching(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const data = await adminApi.universalCommunication.getHistory();
            setHistory(data.history || []);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const data = await adminApi.universalCommunication.getTemplates();
            setTemplates(data.templates || []);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            // This would typically fetch from a users API - using mock data for now
            // In production, this would be: const response = await fetch('/api/v1/admin/users');
            const mockUsers: User[] = [
                { id: 1, user_name: 'admin', email: 'admin@genvolt.com', first_name: 'Admin', last_name: 'User' },
                { id: 2, user_name: 'operator1', email: 'operator1@genvolt.com', first_name: 'John', last_name: 'Operator' },
                { id: 878, user_name: 'testuser', email: 'test@genvolt.com', first_name: 'Test', last_name: 'User' }
            ];
            setUsers(mockUsers);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    // Helper function to parse existing endpoint URLs
    const parseEndpointUrl = (fullUrl: string): { protocol: 'http' | 'https', base_url: string, function_code: string } => {
        try {
            const url = new URL(fullUrl);
            const protocol = url.protocol === 'https:' ? 'https' : 'http';
            const codeMatch = url.search.match(/code=([^&]+)/);
            const functionCode = codeMatch ? codeMatch[1] : '';
            const baseUrl = fullUrl.replace(/[?&]code=[^&]+/, '').replace(/[?&]$/, '');
            
            return { protocol, base_url: baseUrl, function_code: functionCode };
        } catch {
            return { protocol: 'http', base_url: fullUrl, function_code: '' };
        }
    };

    // Helper function to construct full endpoint URL
    const constructEndpointUrl = (): string => {
        if (!settings.base_url) return '';
        
        let fullUrl = settings.base_url;
        // Remove trailing slashes but preserve trailing question mark
        fullUrl = fullUrl.replace(/\/+$/, '');
        
        // Add query parameters if present
        if (settings.function_code) {
            // Check if we need a separator
            let separator = '';
            if (fullUrl.endsWith('?')) {
                // Base URL already ends with ?, no separator needed
                separator = '';
            } else if (fullUrl.includes('?')) {
                // Base URL has existing query params, use &
                separator = '&';
            } else {
                // No query params yet, use ?
                separator = '?';
            }
            
            // Add the query parameters (could be code=... or api_key=... etc)
            fullUrl = `${fullUrl}${separator}${settings.function_code}`;
        }
        
        return fullUrl;
    };

    const validateSettings = (): string | null => {
        if (!settings.base_url) {
            return 'Base URL is required';
        }

        // Construct full URL for validation
        const fullUrl = constructEndpointUrl();
        
        try {
            new URL(fullUrl);
        } catch {
            return 'Invalid URL format';
        }

        if (settings.retry_attempts < 0 || settings.retry_attempts > 10) {
            return 'Retry attempts must be between 0 and 10';
        }

        return null;
    };

    const handleSave = async () => {
        let communicationSettings;
        let displayEndpoint;
        
        if (isJsonBuilderMode) {
            // Use JSON builder settings
            communicationSettings = generateJsonFromFields();
            displayEndpoint = communicationSettings.endpoint_url || 'Custom JSON configuration';
            
            // Basic validation for JSON builder mode
            if (Object.keys(communicationSettings).length === 0) {
                toast({
                    title: "Validation Error",
                    description: "Please add at least one field to the JSON configuration",
                    variant: "destructive"
                });
                return;
            }
        } else {
            // Use standard settings
            const validationError = validateSettings();
            if (validationError) {
                toast({
                    title: "Validation Error",
                    description: validationError,
                    variant: "destructive"
                });
                return;
            }
            
            communicationSettings = {
                ...settings,
                endpoint_url: constructEndpointUrl()
            };
            displayEndpoint = constructEndpointUrl();
        }

        const confirmed = window.confirm(
            `This will update the communication endpoint for ALL 2000+ devices.\n\n` +
            `New endpoint: ${displayEndpoint}\n\n` +
            `Configuration mode: ${isJsonBuilderMode ? 'Custom JSON' : 'Standard'}\n\n` +
            `Are you sure you want to proceed?`
        );

        if (!confirmed) return;

        setIsLoading(true);

        try {
            await adminApi.universalCommunication.updateConfig({
                configuration_name: 'Universal Communication Settings',
                communication_settings: communicationSettings,
                notes: notes || `Updated via admin interface (${isJsonBuilderMode ? 'JSON Builder' : 'Standard'} mode)`
            });

            toast({
                title: "Success",
                description: "Universal communication settings updated successfully. All devices will receive the new configuration.",
                variant: "default"
            });
            fetchCurrentConfig();
            fetchHistory();
            setNotes('');
        } catch (error) {
            toast({
                title: "Network Error",
                description: "Network error while updating configuration",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        if (currentConfig?.communication_settings?.communication_settings) {
            const existingSettings = currentConfig.communication_settings.communication_settings;
            
            // Handle backward compatibility
            if (existingSettings.endpoint_url && !existingSettings.base_url) {
                const urlParts = parseEndpointUrl(existingSettings.endpoint_url);
                setSettings({
                    protocol: urlParts.protocol,
                    base_url: urlParts.base_url,
                    function_code: urlParts.function_code,
                    retry_attempts: existingSettings.retry_attempts || 3
                });
            } else {
                setSettings({
                    protocol: existingSettings.protocol || 'http',
                    base_url: existingSettings.base_url || '',
                    function_code: existingSettings.function_code || '',
                    retry_attempts: existingSettings.retry_attempts || 3
                });
            }
            setNotes('');
        }
    };

    // Template management functions
    const handleSaveTemplate = async () => {
        let communicationSettings;
        
        if (isJsonBuilderMode) {
            // Use JSON builder settings
            communicationSettings = generateJsonFromFields();
            
            // Basic validation for JSON builder mode
            if (Object.keys(communicationSettings).length === 0) {
                toast({
                    title: "Validation Error",
                    description: "Please add at least one field to the JSON configuration",
                    variant: "destructive"
                });
                return;
            }
        } else {
            // Use standard settings
            const validationError = validateSettings();
            if (validationError) {
                toast({
                    title: "Validation Error",
                    description: validationError,
                    variant: "destructive"
                });
                return;
            }
            
            communicationSettings = {
                ...settings,
                endpoint_url: constructEndpointUrl()
            };
        }

        if (!saveData.configuration_name.trim()) {
            toast({
                title: "Validation Error",
                description: "Configuration name is required",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            await adminApi.universalCommunication.saveAsTemplate({
                configuration_name: saveData.configuration_name,
                description: saveData.description,
                communication_settings: communicationSettings,
                allowed_users: selectedUsers,
                notes: saveData.notes || saveData.description || `Saved via admin interface (${isJsonBuilderMode ? 'JSON Builder' : 'Standard'} mode)`
            });

            toast({
                title: "Success",
                description: "Configuration template saved successfully",
                variant: "default"
            });
            setShowSaveDialog(false);
            setSaveData({
                configuration_name: '',
                description: '',
                allowed_users: [],
                notes: ''
            });
            setSelectedUsers([]);
            fetchTemplates();
        } catch (error) {
            toast({
                title: "Network Error",
                description: "Network error while saving template",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivateTemplate = async (templateId: number, templateName: string) => {
        const confirmed = window.confirm(
            `This will activate the "${templateName}" configuration for ALL 2000+ devices.\n\n` +
            `Are you sure you want to proceed?`
        );

        if (!confirmed) return;

        setIsLoading(true);

        try {
            await adminApi.universalCommunication.activateConfig(templateId);

            toast({
                title: "Success",
                description: "Configuration activated successfully. All devices will receive the new configuration.",
                variant: "default"
            });
            fetchCurrentConfig();
            fetchHistory();
            fetchTemplates();
        } catch (error) {
            toast({
                title: "Network Error",
                description: "Network error while activating configuration",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTemplate = async (templateId: number, templateName: string) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete the "${templateName}" configuration template?\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) return;

        setIsLoading(true);

        try {
            await adminApi.universalCommunication.deleteTemplate(templateId);

            toast({
                title: "Success",
                description: "Configuration template deleted successfully",
                variant: "default"
            });
            fetchTemplates();
        } catch (error) {
            toast({
                title: "Network Error",
                description: "Network error while deleting template",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserSelectionChange = (userId: number, checked: boolean) => {
        if (checked) {
            setSelectedUsers([...selectedUsers, userId]);
        } else {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        }
    };

    // JSON Builder helper functions
    const generateFieldId = () => {
        return 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    const addJsonField = () => {
        const newField: JsonField = {
            id: generateFieldId(),
            name: '',
            value: ''
        };
        setCustomJsonFields([...customJsonFields, newField]);
    };

    const removeJsonField = (fieldId: string) => {
        setCustomJsonFields(customJsonFields.filter(field => field.id !== fieldId));
    };

    const updateJsonField = (fieldId: string, name: string, value: string) => {
        setCustomJsonFields(customJsonFields.map(field => 
            field.id === fieldId ? { ...field, name, value } : field
        ));
    };

    const moveJsonFieldUp = (fieldId: string) => {
        const index = customJsonFields.findIndex(field => field.id === fieldId);
        if (index > 0) {
            const newFields = [...customJsonFields];
            [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
            setCustomJsonFields(newFields);
        }
    };

    const moveJsonFieldDown = (fieldId: string) => {
        const index = customJsonFields.findIndex(field => field.id === fieldId);
        if (index < customJsonFields.length - 1) {
            const newFields = [...customJsonFields];
            [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
            setCustomJsonFields(newFields);
        }
    };

    const generateJsonFromFields = (): any => {
        const jsonObj: any = {};
        
        // Add basic fields if in simple mode
        if (!isJsonBuilderMode) {
            jsonObj.protocol = settings.protocol;
            jsonObj.base_url = settings.base_url;
            if (settings.function_code) {
                jsonObj.function_code = settings.function_code;
            }
            jsonObj.retry_attempts = settings.retry_attempts;
            jsonObj.endpoint_url = constructEndpointUrl();
        } else {
            // Generate from custom fields
            customJsonFields.forEach(field => {
                if (field.name.trim() && field.value.trim()) {
                    jsonObj[field.name.trim()] = field.value.trim();
                }
            });
            
            // Simple concatenation: build endpoint_url by concatenating all field values in order
            let endpointUrl = '';
            customJsonFields.forEach(field => {
                if (field.name.trim() && field.value.trim() && field.name.trim() !== 'endpoint_url') {
                    endpointUrl += field.value.trim();
                }
            });
            
            // Only set endpoint_url if we have content
            if (endpointUrl) {
                jsonObj.endpoint_url = endpointUrl;
            }
        }
        
        return jsonObj;
    };

    const updateJsonPreview = () => {
        const jsonObj = generateJsonFromFields();
        setJsonPreview(JSON.stringify(jsonObj, null, 2));
    };

    const loadThingspeakTemplate = () => {
        const thingspeakFields: JsonField[] = [
            { id: generateFieldId(), name: 'base_url', value: 'https://api.thingspeak.com/update?' },
            { id: generateFieldId(), name: 'api_key', value: 'api_key=YOUR_API_KEY' },
            { id: generateFieldId(), name: 'sep1', value: '&' },
            { id: generateFieldId(), name: 'field1', value: 'field1=0' }
        ];
        setCustomJsonFields(thingspeakFields);
        setIsJsonBuilderMode(true);
    };

    const loadWebhookTemplate = () => {
        const webhookFields: JsonField[] = [
            { id: generateFieldId(), name: 'base_url', value: 'https://webhook.site/unique-url' },
            { id: generateFieldId(), name: 'auth_token', value: 'Bearer abc123' },
            { id: generateFieldId(), name: 'content_type', value: 'application/json' }
        ];
        setCustomJsonFields(webhookFields);
        setIsJsonBuilderMode(true);
    };

    const loadMqttTemplate = () => {
        const mqttFields: JsonField[] = [
            { id: generateFieldId(), name: 'broker_url', value: 'mqtt://broker.hivemq.com' },
            { id: generateFieldId(), name: 'topic', value: 'devices/telemetry' },
            { id: generateFieldId(), name: 'username', value: 'device_user' },
            { id: generateFieldId(), name: 'password', value: 'secure_pass' },
            { id: generateFieldId(), name: 'port', value: '1883' }
        ];
        setCustomJsonFields(mqttFields);
        setIsJsonBuilderMode(true);
    };

    const loadAzureIoTHubTemplate = () => {
        const azureFields: JsonField[] = [
            { id: generateFieldId(), name: 'base_url', value: 'https://GenIoTHub.azure-devices.net/devices/' },
            { id: generateFieldId(), name: 'device_id', value: 'HK00008' },
            { id: generateFieldId(), name: 'api_endpoint', value: '/messages/events?' },
            { id: generateFieldId(), name: 'api_version', value: 'api-version=2020-03-13' },
            { id: generateFieldId(), name: 'sas_token', value: 'SharedAccessSignature sr=GenIoTHub.azure-devices.net%2Fdevices%2FHK00008&sig=YOUR_SIGNATURE&se=EXPIRY' }
        ];
        setCustomJsonFields(azureFields);
        setIsJsonBuilderMode(true);
    };

    const loadAWSIoTCoreTemplate = () => {
        const awsFields: JsonField[] = [
            { id: generateFieldId(), name: 'base_url', value: 'https://' },
            { id: generateFieldId(), name: 'iot_endpoint', value: 'your-endpoint-ats.iot.region.amazonaws.com' },
            { id: generateFieldId(), name: 'topic_path', value: '/topics/' },
            { id: generateFieldId(), name: 'topic_name', value: 'device/telemetry' },
            { id: generateFieldId(), name: 'qos_param', value: '?qos=1' }
        ];
        setCustomJsonFields(awsFields);
        setIsJsonBuilderMode(true);
    };

    // Update JSON preview whenever fields change
    React.useEffect(() => {
        updateJsonPreview();
    }, [customJsonFields, isJsonBuilderMode, settings]);

    // Smart visibility management - when JSON builder is active, suggest hiding standard settings
    React.useEffect(() => {
        if (isJsonBuilderMode && showStandardSettings) {
            // User switched to JSON builder mode - suggest hiding standard settings for cleaner UI
            // But don't force it - let user decide
        }
    }, [isJsonBuilderMode]);

    if (isFetching) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading configuration...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Globe className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Universal Communication Settings</h2>
            </div>
            
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    <strong>Warning:</strong> These settings apply to ALL devices in the system. 
                    Changes here will immediately affect all 2000+ devices.
                </AlertDescription>
            </Alert>

            {currentConfig && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Current Active Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p><strong>Last updated:</strong> {new Date(currentConfig.activated_at).toLocaleString()}</p>
                        <p><strong>Config ID:</strong> {currentConfig.config_id}</p>
                        <div><strong>Hash:</strong> <Badge variant="secondary">{currentConfig.config_hash.substring(0, 8)}...</Badge></div>
                        {currentConfig.notes && <p><strong>Notes:</strong> {currentConfig.notes}</p>}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Configuration Settings
                                {!isJsonBuilderMode && <Badge variant="secondary">Standard Mode</Badge>}
                            </CardTitle>
                            <CardDescription>
                                {isJsonBuilderMode ? 
                                    'Standard form-based configuration (JSON Builder is active in Advanced Settings)' :
                                    'Update communication settings for all IoT devices'
                                }
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowStandardSettings(!showStandardSettings)}
                            className="flex items-center gap-2"
                        >
                            {showStandardSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {showStandardSettings ? 'Hide' : 'Show'} Standard Settings
                        </Button>
                    </div>
                </CardHeader>
                {showStandardSettings && (
                    <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="protocol">Protocol</Label>
                            <Select 
                                value={settings.protocol}
                                onValueChange={(value) => setSettings({...settings, protocol: value as 'http' | 'https'})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="http">HTTP (Default)</SelectItem>
                                    <SelectItem value="https">HTTPS</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Communication protocol for device connections
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="retry-attempts">Retry Attempts</Label>
                            <Input 
                                id="retry-attempts"
                                type="number" 
                                min="0" 
                                max="10"
                                value={settings.retry_attempts}
                                onChange={(e) => setSettings({...settings, retry_attempts: parseInt(e.target.value) || 0})}
                            />
                            <p className="text-sm text-muted-foreground">
                                Number of retry attempts on failure (0-10)
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="base-url">
                            Base Endpoint URL <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                            id="base-url"
                            type="text" 
                            value={settings.base_url}
                            onChange={(e) => setSettings({...settings, base_url: e.target.value})}
                            placeholder="http://func-iot-ingest-dev-54680.centralindia-01.azurewebsites.net/api/ingest?"
                        />
                        <p className="text-sm text-muted-foreground">
                            Base URL where all devices will send their data. End with '?' if you plan to add query parameters below.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="function-code">
                            Query Parameters (Optional)
                        </Label>
                        <Input 
                            id="function-code"
                            type="text" 
                            value={settings.function_code || ''}
                            onChange={(e) => setSettings({...settings, function_code: e.target.value})}
                            placeholder="code=YOUR_AZURE_FUNCTION_CODE or api_key=YOUR_API_KEY&field1=0"
                        />
                        <p className="text-sm text-muted-foreground">
                            Query parameters to append to the endpoint URL. Examples:<br/>
                            • Azure Functions: <code>code=YOUR_AZURE_FUNCTION_CODE</code><br/>
                            • API with key: <code>api_key=YOUR_API_KEY&field1=0</code>
                        </p>
                    </div>

                    {settings.base_url && !isJsonBuilderMode && (
                        <Alert>
                            <AlertDescription>
                                <strong>Full Endpoint URL:</strong>
                                <br />
                                <code className="block mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                                    {constructEndpointUrl()}
                                </code>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="notes">Change Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Reason for this configuration change..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button 
                            onClick={handleSave} 
                            disabled={isLoading}
                            className="flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update All Devices'
                            )}
                        </Button>

                        <Button 
                            variant="outline"
                            onClick={handleReset}
                            disabled={isLoading}
                        >
                            Reset to Current
                        </Button>

                        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                            <DialogTrigger asChild>
                                <Button 
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    Save as Template
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Save Configuration Template</DialogTitle>
                                    <DialogDescription>
                                        Save the current configuration as a template that can be activated later.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="template-name">Configuration Name *</Label>
                                        <Input
                                            id="template-name"
                                            value={saveData.configuration_name}
                                            onChange={(e) => setSaveData({...saveData, configuration_name: e.target.value})}
                                            placeholder="e.g., Production Endpoint, Backup Configuration"
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="template-description">Description</Label>
                                        <Textarea
                                            id="template-description"
                                            value={saveData.description}
                                            onChange={(e) => setSaveData({...saveData, description: e.target.value})}
                                            placeholder="Brief description of this configuration..."
                                            rows={2}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Users Who Can Activate This Configuration</Label>
                                        <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                                            {users.map(user => (
                                                <div key={user.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`user-${user.id}`}
                                                        checked={selectedUsers.includes(user.id)}
                                                        onCheckedChange={(checked) => 
                                                            handleUserSelectionChange(user.id, checked as boolean)
                                                        }
                                                    />
                                                    <Label htmlFor={`user-${user.id}`} className="text-sm">
                                                        {user.first_name} {user.last_name} ({user.user_name})
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Select users who will be able to activate this configuration
                                        </p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowSaveDialog(false)}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSaveTemplate}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Template'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button 
                            variant="outline"
                            onClick={() => setShowSavedConfigs(!showSavedConfigs)}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            {showSavedConfigs ? 'Hide' : 'Show'} Saved Configurations
                        </Button>

                        <Button 
                            variant="outline"
                            onClick={() => setShowHistory(!showHistory)}
                            className="flex items-center gap-2"
                        >
                            <History className="h-4 w-4" />
                            {showHistory ? 'Hide' : 'Show'} History
                        </Button>
                    </div>
                    </CardContent>
                )}
            </Card>

            {/* Advanced Settings - JSON Builder - MOVED OUTSIDE Configuration Settings Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                <h3 className="text-lg font-semibold">Advanced Settings</h3>
                                {isJsonBuilderMode && <Badge variant="default">JSON Builder Active</Badge>}
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                                className="flex items-center gap-2"
                            >
                                {showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
                            </Button>
                        </div>

                        {showAdvancedSettings && (
                            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label className="text-base font-medium">Configuration Mode</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Choose between standard form-based configuration or custom JSON builder
                                        </p>
                                    </div>
                                    <Switch
                                        checked={isJsonBuilderMode}
                                        onCheckedChange={setIsJsonBuilderMode}
                                    />
                                </div>

                                {isJsonBuilderMode && (
                                    <>
                                        <Alert>
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>
                                                <strong>JSON Builder Mode:</strong> Create custom communication settings for any service. 
                                                This allows flexible configuration beyond the standard form fields.
                                            </AlertDescription>
                                        </Alert>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-medium">Quick Templates</Label>
                                                <div className="flex gap-2 flex-wrap">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={loadThingspeakTemplate}
                                                        className="text-xs"
                                                    >
                                                        ThingSpeak
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={loadWebhookTemplate}
                                                        className="text-xs"
                                                    >
                                                        Webhook
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={loadMqttTemplate}
                                                        className="text-xs"
                                                    >
                                                        MQTT
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={loadAzureIoTHubTemplate}
                                                        className="text-xs"
                                                    >
                                                        Azure IoT Hub
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={loadAWSIoTCoreTemplate}
                                                        className="text-xs"
                                                    >
                                                        AWS IoT Core
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-medium">JSON Fields</Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addJsonField}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Add Field
                                                    </Button>
                                                </div>

                                                {customJsonFields.length === 0 ? (
                                                    <div className="text-center text-muted-foreground py-4 border-2 border-dashed rounded-lg">
                                                        No fields added yet. Click "Add Field" or use a quick template to get started.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {customJsonFields.map((field, index) => (
                                                            <div key={field.id} className="flex items-center gap-2 p-2 border rounded bg-white">
                                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                                    <Input
                                                                        placeholder="Field name (e.g., base_url)"
                                                                        value={field.name}
                                                                        onChange={(e) => updateJsonField(field.id, e.target.value, field.value)}
                                                                        className="text-sm"
                                                                    />
                                                                    <Input
                                                                        placeholder="Field value (e.g., https://api.example.com)"
                                                                        value={field.value}
                                                                        onChange={(e) => updateJsonField(field.id, field.name, e.target.value)}
                                                                        className="text-sm"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => moveJsonFieldUp(field.id)}
                                                                        disabled={index === 0}
                                                                        className="h-8 w-8 p-0"
                                                                    >
                                                                        <ChevronUp className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => moveJsonFieldDown(field.id)}
                                                                        disabled={index === customJsonFields.length - 1}
                                                                        className="h-8 w-8 p-0"
                                                                    >
                                                                        <ChevronDown className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removeJsonField(field.id)}
                                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {(isJsonBuilderMode && customJsonFields.length > 0) && (
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Live JSON Preview</Label>
                                                    <div className="relative">
                                                        <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                                            {jsonPreview}
                                                        </pre>
                                                        {JSON.parse(jsonPreview).endpoint_url && (
                                                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                                                <p className="text-xs text-blue-800">
                                                                    <strong>Generated Endpoint URL:</strong>
                                                                </p>
                                                                <code className="text-xs text-blue-900 break-all">
                                                                    {JSON.parse(jsonPreview).endpoint_url}
                                                                </code>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Action Buttons for Advanced Settings */}
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={isLoading}
                                        className="flex items-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            'Update All Devices'
                                        )}
                                    </Button>

                                    <Button 
                                        variant="outline"
                                        onClick={handleReset}
                                        disabled={isLoading}
                                    >
                                        Reset to Current
                                    </Button>

                                    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                                        <DialogTrigger asChild>
                                            <Button 
                                                variant="outline"
                                                className="flex items-center gap-2"
                                            >
                                                <Save className="h-4 w-4" />
                                                Save as Template
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[500px]">
                                            <DialogHeader>
                                                <DialogTitle>Save Configuration Template</DialogTitle>
                                                <DialogDescription>
                                                    Save the current configuration as a template that can be activated later.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="template-name-advanced">Configuration Name *</Label>
                                                    <Input
                                                        id="template-name-advanced"
                                                        value={saveData.configuration_name}
                                                        onChange={(e) => setSaveData({...saveData, configuration_name: e.target.value})}
                                                        placeholder="e.g., ThingSpeak Production, Custom Webhook Config"
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label htmlFor="template-description-advanced">Description</Label>
                                                    <Textarea
                                                        id="template-description-advanced"
                                                        value={saveData.description}
                                                        onChange={(e) => setSaveData({...saveData, description: e.target.value})}
                                                        placeholder="Brief description of this configuration..."
                                                        rows={2}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Users Who Can Activate This Configuration</Label>
                                                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                                                        {users.map(user => (
                                                            <div key={user.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`user-advanced-${user.id}`}
                                                                    checked={selectedUsers.includes(user.id)}
                                                                    onCheckedChange={(checked) => 
                                                                        handleUserSelectionChange(user.id, checked as boolean)
                                                                    }
                                                                />
                                                                <Label htmlFor={`user-advanced-${user.id}`} className="text-sm">
                                                                    {user.first_name} {user.last_name} ({user.user_name})
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Select users who will be able to activate this configuration
                                                    </p>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowSaveDialog(false)}
                                                    disabled={isLoading}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleSaveTemplate}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        'Save Template'
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    <Button 
                                        variant="outline"
                                        onClick={() => setShowSavedConfigs(!showSavedConfigs)}
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {showSavedConfigs ? 'Hide' : 'Show'} Saved Configurations
                                    </Button>

                                    <Button 
                                        variant="outline"
                                        onClick={() => setShowHistory(!showHistory)}
                                        className="flex items-center gap-2"
                                    >
                                        <History className="h-4 w-4" />
                                        {showHistory ? 'Hide' : 'Show'} History
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {showSavedConfigs && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Save className="h-5 w-5" />
                            Saved Configuration Templates
                        </CardTitle>
                        <CardDescription>
                            Manage and activate saved universal communication configurations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {templates.length === 0 ? (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    No saved configuration templates found. Save your current configuration to create templates.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-4">
                                {templates.map((template) => {
                                    const endpointUrl = template.communication_settings.endpoint_url || 
                                        `${template.communication_settings.base_url}${template.communication_settings.function_code ? '?code=' + template.communication_settings.function_code : ''}`;
                                    
                                    return (
                                        <div key={template.config_id} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{template.configuration_name}</h4>
                                                    {template.is_active && (
                                                        <Badge variant="default" className="text-xs">Active</Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Created {new Date(template.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            
                                            <div className="text-sm space-y-1">
                                                <p><strong>Endpoint:</strong></p>
                                                <code className="block p-2 bg-gray-100 rounded text-xs break-all">
                                                    {endpointUrl}
                                                </code>
                                            </div>
                                            
                                            <div className="text-sm">
                                                <p><strong>Protocol:</strong> {template.communication_settings.protocol?.toUpperCase() || 'HTTP'}</p>
                                                <p><strong>Retry Attempts:</strong> {template.communication_settings.retry_attempts || 3}</p>
                                            </div>
                                            
                                            {template.allowed_user_names.length > 0 && (
                                                <div className="text-sm">
                                                    <p className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        <strong>Can be activated by:</strong>
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {template.allowed_user_names.map((username, index) => (
                                                            <Badge key={index} variant="secondary" className="text-xs">
                                                                {username}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {template.notes && (
                                                <div className="text-sm">
                                                    <p><strong>Notes:</strong> {template.notes}</p>
                                                </div>
                                            )}
                                            
                                            <div className="flex gap-2 pt-2">
                                                {!template.is_active && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleActivateTemplate(template.config_id, template.configuration_name)}
                                                        disabled={isLoading}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Play className="h-3 w-3" />
                                                        Activate
                                                    </Button>
                                                )}
                                                
                                                {!template.is_active && (
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDeleteTemplate(template.config_id, template.configuration_name)}
                                                        disabled={isLoading}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {showHistory && (
                <Card>
                    <CardHeader>
                        <CardTitle>Configuration History</CardTitle>
                        <CardDescription>Recent changes to universal communication settings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <p className="text-muted-foreground">No configuration history available</p>
                        ) : (
                            <div className="space-y-4">
                                {history.map((item) => (
                                    <div key={item.audit_id} className="border rounded p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={item.is_current ? "default" : "secondary"}>
                                                    {item.action}
                                                </Badge>
                                                {item.is_current && (
                                                    <Badge variant="outline" className="text-green-600">Current</Badge>
                                                )}
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(item.changed_at).toLocaleString()}
                                            </span>
                                        </div>
                                        
                                        {item.previous_endpoint && item.new_endpoint && (
                                            <div className="text-sm space-y-1">
                                                <p><strong>From:</strong> {item.previous_endpoint}</p>
                                                <p><strong>To:</strong> {item.new_endpoint}</p>
                                            </div>
                                        )}
                                        
                                        <p className="text-sm">
                                            <strong>Changed by:</strong> {item.changed_by_name || item.changed_by}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};