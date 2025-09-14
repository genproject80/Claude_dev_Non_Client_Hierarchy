// QUICK FIX FOR COLLAPSIBLE ISSUE
// The issue: Advanced Settings were nested inside Configuration Settings CardContent
// The solution: Move Advanced Settings to its own separate Card outside Configuration Settings

// Key changes needed:
// 1. Configuration Settings Card should be completely separate from Advanced Settings Card
// 2. Both cards should be independent and collapsible separately

// Structure should be:
/*
<Card> {/* Configuration Settings */}
  <CardHeader with toggle button />
  {showStandardSettings && (
    <CardContent>
      {/* Standard form fields */}
      {/* Notes field */}
      {/* Action buttons */}
    </CardContent>
  )}
</Card>

<Card> {/* Advanced Settings - SEPARATE CARD */}
  <CardContent>
    <div> {/* Advanced Settings header with toggle */}
    {showAdvancedSettings && (
      <div>
        {/* JSON Builder content */}
      </div>
    )}
  </CardContent>
</Card>

<Card> {/* Saved Configurations */}
  {/* Templates content */}
</Card>

<Card> {/* History */}
  {/* History content */}
</Card>
*/

// The fix is to ensure Advanced Settings is NOT nested inside Configuration Settings CardContent
// Both sections should be independent cards that can be collapsed separately