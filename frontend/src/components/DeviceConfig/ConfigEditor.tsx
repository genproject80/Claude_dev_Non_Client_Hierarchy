import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Wrench,
  Code
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfigBuilder from "./ConfigBuilder";

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

interface ConfigTemplate {
  template_id: number;
  template_name: string;
  description?: string;
  template_data: any;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface ConfigEditorProps {
  deviceId: string;
  config?: DeviceConfig | null;
  templates: ConfigTemplate[];
  templatesLoading: boolean;
  onSave: (data: {
    config_name: string;
    config_data: any;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export const ConfigEditor = ({
  deviceId,
  config,
  templates,
  templatesLoading,
  onSave,
  onCancel
}: ConfigEditorProps) => {
  const [configName, setConfigName] = useState(config?.config_name || "");
  const [configData, setConfigData] = useState(
    config?.config_data ? JSON.stringify(config.config_data, null, 2) : ""
  );
  const [notes, setNotes] = useState(config?.notes || "");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [jsonError, setJsonError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [useBuilder, setUseBuilder] = useState(false);
  const { toast } = useToast();

  const isEditing = !!config;
  
  // Debug button state
  React.useEffect(() => {
    console.log('ConfigEditor state:', {
      isEditing,
      saving,
      configName: configName?.length,
      configData: configData?.length,
      jsonError: !!jsonError,
      buttonDisabled: saving || !configName.trim() || !configData.trim() || !!jsonError
    });
  }, [isEditing, saving, configName, configData, jsonError]);

  // Validate JSON when configData changes
  useEffect(() => {
    if (!configData.trim()) {
      setJsonError("");
      return;
    }

    try {
      JSON.parse(configData);
      setJsonError("");
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON syntax");
    }
  }, [configData]);

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || templateId === "none") {
      setSelectedTemplate("");
      return;
    }

    const template = templates.find(t => t.template_id.toString() === templateId);
    console.log('Template selected:', { templateId, template, templates });
    if (template) {
      // Get template data with fallback for property naming
      const templateData = template.template_data || template.templateData;
      
      // If editing and there's existing data, confirm before overwriting
      if (isEditing && configData.trim() && configData !== JSON.stringify(templateData, null, 2)) {
        const shouldReplace = window.confirm(
          "Applying this template will replace your current configuration data. Are you sure you want to continue?"
        );
        if (!shouldReplace) {
          return;
        }
      }

      setSelectedTemplate(templateId);
      setConfigData(JSON.stringify(templateData, null, 2));
      
      // Only update name for new configs, not when editing
      console.log('Name update check:', { isEditing, configName, template_name: template.template_name, templateName: template.templateName });
      if (!isEditing && !configName && (template.template_name || template.templateName)) {
        const templateName = template.template_name || template.templateName;
        setConfigName(`${templateName} - ${deviceId}`);
        console.log('Set config name to:', `${templateName} - ${deviceId}`);
      }
      
      const templateName = template.template_name || template.templateName;
      toast({
        title: "Template Applied",
        description: `Applied template: ${templateName}`
      });
    }
  };

  const handleSave = async () => {
    if (!configName.trim()) {
      toast({
        title: "Validation Error",
        description: "Configuration name is required",
        variant: "destructive"
      });
      return;
    }

    if (!configData.trim()) {
      toast({
        title: "Validation Error",
        description: "Configuration data is required",
        variant: "destructive"
      });
      return;
    }

    if (jsonError) {
      toast({
        title: "Validation Error",
        description: "Please fix JSON syntax errors before saving",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const parsedData = JSON.parse(configData);
      
      await onSave({
        config_name: configName.trim(),
        config_data: parsedData,
        notes: notes.trim() || undefined
      });
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(configData);
      setConfigData(JSON.stringify(parsed, null, 2));
      toast({
        title: "JSON Formatted",
        description: "JSON has been formatted"
      });
    } catch (error) {
      toast({
        title: "Format Error",
        description: "Cannot format invalid JSON",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(configData);
      toast({
        title: "Copied",
        description: "Configuration copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const renderJsonPreview = () => {
    if (jsonError || !configData.trim()) return null;

    try {
      const parsed = JSON.parse(configData);
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Configuration Preview</h4>
          <ScrollArea className="h-48 border rounded-md p-3 bg-muted/50">
            <pre className="text-xs">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      );
    } catch {
      return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>
            {isEditing ? `Edit Configuration: ${config.config_name}` : 'Create New Configuration'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="config-name">Configuration Name *</Label>
            <Input
              id="config-name"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Enter configuration name"
              className={!configName.trim() ? "border-red-300" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="device-id">Device ID</Label>
            <Input
              id="device-id"
              value={deviceId}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        {/* Template Selection */}
        {templates.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="template-select">
              {isEditing ? "Apply Template (Optional)" : "Start from Template (Optional)"}
            </Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder={isEditing ? "Apply a template..." : "Choose a template..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates
                  .filter(t => t.is_active)
                  .map((template) => (
                    <SelectItem key={template.template_id} value={template.template_id.toString()}>
                      <div>
                        <div className="font-medium">{template.template_name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        )}
                        <Badge variant="outline" className="text-xs mt-1">
                          {template.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Editor Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            <Label htmlFor="builder-mode" className="font-medium">
              Configuration Mode:
            </Label>
            <Badge variant={useBuilder ? "default" : "secondary"}>
              {useBuilder ? "Form Builder" : "JSON Editor"}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Code className={`h-4 w-4 ${!useBuilder ? 'text-primary' : 'text-muted-foreground'}`} />
            <Switch
              id="builder-mode"
              checked={useBuilder}
              onCheckedChange={setUseBuilder}
            />
            <Wrench className={`h-4 w-4 ${useBuilder ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>

        {/* Configuration Editor - Builder or JSON */}
        {useBuilder ? (
          <ConfigBuilder
            deviceId={deviceId}
            onJsonGenerated={(json) => setConfigData(json)}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="config-data">Configuration Data (JSON) *</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={formatJson}
                  disabled={!configData.trim() || !!jsonError}
                >
                  Format JSON
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  disabled={!configData.trim()}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={!configData.trim() || !!jsonError}
                >
                  {showPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                  {showPreview ? "Hide" : "Preview"}
                </Button>
              </div>
            </div>

            <Textarea
              id="config-data"
              value={configData}
              onChange={(e) => setConfigData(e.target.value)}
              placeholder="Enter JSON configuration data..."
              rows={12}
              className={`font-mono text-sm ${jsonError ? "border-red-300" : ""}`}
              style={{ whiteSpace: 'pre-wrap' }}
            />

            {jsonError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>JSON Validation Error:</strong> {jsonError}
                </AlertDescription>
              </Alert>
            )}

            {!jsonError && configData.trim() && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  JSON syntax is valid
                </AlertDescription>
              </Alert>
            )}

            {showPreview && renderJsonPreview()}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this configuration..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !configName.trim() || !configData.trim() || !!jsonError}
            title={
              saving ? "Saving..." :
              !configName.trim() ? "Configuration name is required" :
              !configData.trim() ? "Configuration data is required" :
              !!jsonError ? `JSON Error: ${jsonError}` :
              "Ready to save"
            }
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};