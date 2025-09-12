/**
 * API Key Viewer Component for Phase 5 Device Authentication
 * Allows admin users to view and manage device API keys with security audit logging
 * 
 * Features:
 * - Masked/revealed API key display
 * - One-click copy to clipboard
 * - API key regeneration
 * - Auto-hide after 60 seconds for security
 * - Comprehensive audit logging
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Copy, Eye, EyeOff, RefreshCw, Shield, Clock, Activity } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface ApiKeyDetails {
  device_id: string;
  api_key: string;
  created_at: string;
  last_used: string | null;
  usage_count: number;
  is_active: boolean;
  expires_at: string | null;
  viewed_by: string;
  viewed_at: string;
}

interface ApiKeyViewerProps {
  deviceId: string;
  onApiKeyRegenerated?: (newKey: string) => void;
}

export const ApiKeyViewer: React.FC<ApiKeyViewerProps> = ({ 
  deviceId, 
  onApiKeyRegenerated 
}) => {
  const [apiKeyDetails, setApiKeyDetails] = useState<ApiKeyDetails | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateReason, setRegenerateReason] = useState('');
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const { toast } = useToast();

  // Auto-hide API key after 60 seconds for security
  useEffect(() => {
    if (apiKeyDetails && hideTimer) {
      return () => clearTimeout(hideTimer);
    }
  }, [apiKeyDetails, hideTimer]);

  /**
   * Fetch API key details from admin API
   */
  const fetchApiKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/device/${deviceId}/api-key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'X-Admin-User': localStorage.getItem('adminUser') || 'unknown',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch API key');
      }

      const data = await response.json();
      setApiKeyDetails(data);

      // Set auto-hide timer for 60 seconds
      const timer = setTimeout(() => {
        setIsRevealed(false);
        setApiKeyDetails(null);
        toast({
          title: 'Security Auto-Hide',
          description: 'API key hidden automatically for security.',
          variant: 'default'
        });
      }, 60000);
      setHideTimer(timer);

      toast({
        title: 'API Key Loaded',
        description: 'API key will auto-hide in 60 seconds for security.',
        variant: 'default'
      });

    } catch (error) {
      console.error('Failed to fetch API key:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch API key',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mask API key for secure display
   */
  const maskApiKey = (key: string): string => {
    if (!key) return '';
    const prefix = key.substring(0, 7);
    const suffix = key.substring(key.length - 4);
    return `${prefix}****...****${suffix}`;
  };

  /**
   * Copy API key to clipboard with audit logging
   */
  const copyToClipboard = async () => {
    if (!apiKeyDetails?.api_key) return;

    try {
      await navigator.clipboard.writeText(apiKeyDetails.api_key);
      
      // Log copy action to audit trail
      await fetch(`/api/admin/device/${deviceId}/api-key/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'X-Admin-User': localStorage.getItem('adminUser') || 'unknown',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'copy' })
      });

      toast({
        title: 'Copied to Clipboard',
        description: 'API key copied successfully. Copy action has been logged.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Failed to copy API key:', error);
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy API key to clipboard.',
        variant: 'destructive'
      });
    }
  };

  /**
   * Regenerate API key with reason logging
   */
  const regenerateApiKey = async () => {
    if (!regenerateReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for regenerating the API key.',
        variant: 'destructive'
      });
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await fetch(`/api/admin/device/${deviceId}/api-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'X-Admin-User': localStorage.getItem('adminUser') || 'unknown',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: regenerateReason.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate API key');
      }

      const data = await response.json();
      
      // Update state with new key
      if (apiKeyDetails) {
        setApiKeyDetails({
          ...apiKeyDetails,
          api_key: data.new_api_key,
          created_at: data.regenerated_at,
          usage_count: 0,
          last_used: null
        });
      }

      // Callback to parent component
      onApiKeyRegenerated?.(data.new_api_key);

      setShowRegenerateDialog(false);
      setRegenerateReason('');
      setIsRevealed(true); // Show new key

      toast({
        title: 'API Key Regenerated',
        description: 'New API key generated successfully. The old key has been deactivated.',
        variant: 'default'
      });

    } catch (error) {
      console.error('Failed to regenerate API key:', error);
      toast({
        title: 'Regeneration Failed',
        description: error instanceof Error ? error.message : 'Failed to regenerate API key',
        variant: 'destructive'
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  /**
   * Hide API key manually
   */
  const hideApiKey = () => {
    setIsRevealed(false);
    setApiKeyDetails(null);
    if (hideTimer) {
      clearTimeout(hideTimer);
      setHideTimer(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          API Key Management
        </CardTitle>
        <CardDescription>
          View and manage API authentication key for device {deviceId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!apiKeyDetails ? (
          <div className="space-y-2">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                API keys are only shown for 60 seconds before automatically hiding for security.
                All viewing and copy actions are logged for audit purposes.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={fetchApiKey} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  View API Key
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* API Key Display */}
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono border">
                  {isRevealed ? apiKeyDetails.api_key : maskApiKey(apiKeyDetails.api_key)}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRevealed(!isRevealed)}
                >
                  {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  disabled={!isRevealed}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Key Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(apiKeyDetails.created_at)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Used</Label>
                <p className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {formatDate(apiKeyDetails.last_used)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Usage Count</Label>
                <p>{apiKeyDetails.usage_count.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge variant={apiKeyDetails.is_active ? 'default' : 'destructive'}>
                  {apiKeyDetails.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={hideApiKey}>
                Hide Key
              </Button>
              
              <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Regenerate API Key</DialogTitle>
                    <DialogDescription>
                      This will deactivate the current API key and generate a new one.
                      The device will need to be updated with the new key.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for regeneration *</Label>
                    <Textarea
                      id="reason"
                      placeholder="Enter reason for key regeneration (required for audit trail)"
                      value={regenerateReason}
                      onChange={(e) => setRegenerateReason(e.target.value)}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {regenerateReason.length}/500 characters
                    </p>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowRegenerateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={regenerateApiKey}
                      disabled={isRegenerating || !regenerateReason.trim()}
                    >
                      {isRegenerating ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        'Regenerate Key'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};