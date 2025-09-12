import express from 'express';
import { body, param, validationResult } from 'express-validator';
import sql from 'mssql';
import database from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Helper function to validate communication settings
function validateCommunicationSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        return { isValid: false, errors: ['Communication settings must be an object'] };
    }

    const errors = [];
    
    // Check for endpoint_url (always required for device communication)
    if (!settings.endpoint_url) {
        // Try to generate it from other fields
        const generatedUrl = generateEndpointUrl(settings);
        if (generatedUrl) {
            settings.endpoint_url = generatedUrl;
        } else {
            errors.push('endpoint_url is required or must be generatable from other fields');
        }
    }

    // Validate endpoint_url format
    if (settings.endpoint_url && typeof settings.endpoint_url === 'string') {
        try {
            // Check if it's a valid URL or partial URL
            if (!settings.endpoint_url.includes('://') && !settings.endpoint_url.startsWith('/')) {
                errors.push('endpoint_url must be a valid URL or path');
            }
        } catch (e) {
            errors.push('endpoint_url must be a valid URL');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Helper function to generate endpoint URL from fields
function generateEndpointUrl(settings) {
    if (!settings || typeof settings !== 'object') return null;
    
    // Simple concatenation of all field values (except endpoint_url to avoid recursion)
    let url = '';
    for (const [key, value] of Object.entries(settings)) {
        if (key !== 'endpoint_url' && value) {
            url += String(value);
        }
    }
    
    return url || null;
}

// Helper function to generate config hash
function generateConfigHash(settings) {
    const jsonString = JSON.stringify(settings);
    return crypto.createHash('sha256').update(jsonString).digest('hex').toUpperCase();
}

// GET /api/v1/admin/universal-communication
// Get current active configuration
router.get('/', async (req, res) => {
    try {
        const result = await database.query(`
            SELECT TOP 1 
                config_id,
                config_name,
                communication_settings,
                config_hash,
                is_active,
                created_by,
                created_at,
                activated_at,
                activated_by,
                notes
            FROM Universal_Communication_Config 
            WHERE is_active = 1
            ORDER BY config_id DESC
        `);
        
        if (!result || result.length === 0) {
            return res.status(404).json({ 
                error: 'No active universal communication configuration found' 
            });
        }
        
        const config = result[0];
        let communicationSettings;
        try {
            communicationSettings = JSON.parse(config.communication_settings);
        } catch (e) {
            console.error('Failed to parse communication_settings for config_id', config.config_id, ':', e.message);
            communicationSettings = {}; // Default empty object
        }
        
        res.json({
            config_id: config.config_id,
            config_name: config.config_name,
            communication_settings: communicationSettings,
            config_hash: config.config_hash,
            is_active: config.is_active,
            created_by: config.created_by,
            created_at: config.created_at,
            activated_at: config.activated_at,
            activated_by: config.activated_by,
            notes: config.notes
        });
    } catch (error) {
        console.error('Error fetching universal communication config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

// GET /api/v1/admin/universal-communication/templates
// Get all saved templates
router.get('/templates', async (req, res) => {
    try {
        const result = await database.query(`
            SELECT 
                config_id,
                configuration_name,
                communication_settings,
                config_hash,
                is_active,
                is_template,
                can_be_activated_by,
                created_by,
                created_at,
                activated_at,
                activated_by,
                notes
            FROM Universal_Communication_Config 
            WHERE is_template = 1
            ORDER BY configuration_name
        `);
        
        // Get all users for username lookup
        const users = await database.query('SELECT id, user_name FROM users');
        const userMap = users.reduce((map, user) => {
            map[user.id] = user.user_name;
            return map;
        }, {});
        
        const templates = result.map(row => {
            let settings;
            try {
                settings = JSON.parse(row.communication_settings);
            } catch (e) {
                console.warn('Failed to parse communication_settings for template config_id', row.config_id, ':', e.message);
                settings = {}; // Default empty object
            }
            
            // Parse the can_be_activated_by JSON array and convert IDs to usernames
            let allowedUserIds = [];
            let allowedUserNames = [];
            if (row.can_be_activated_by) {
                try {
                    allowedUserIds = JSON.parse(row.can_be_activated_by);
                    allowedUserNames = allowedUserIds.map(userId => userMap[userId] || `User ${userId}`);
                } catch (e) {
                    console.warn('Failed to parse can_be_activated_by for config_id', row.config_id, ':', e.message);
                }
            }
            
            return {
                config_id: row.config_id,
                configuration_name: row.configuration_name, // Use configuration_name column as requested
                communication_settings: settings,
                config_hash: row.config_hash,
                is_active: row.is_active,
                is_template: row.is_template,
                allowed_users: allowedUserIds, // Array of user IDs
                allowed_user_names: allowedUserNames, // Array of actual usernames
                allowed_user_emails: [], // Frontend expects this array (emails) - would need another join
                created_by: row.created_by,
                created_by_username: userMap[row.created_by] || 'System',
                created_by_email: '', // Frontend may expect this
                created_at: row.created_at,
                notes: row.notes || ''
            };
        });
        
        res.json({ templates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// POST /api/v1/admin/universal-communication
// Update or create configuration
router.post('/', [
    body('communication_settings').isObject().withMessage('communication_settings must be an object'),
    body('notes').optional().isString()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { communication_settings, notes } = req.body;
    const userId = req.user.id;
    
    try {
        // Validate communication settings
        const validation = validateCommunicationSettings(communication_settings);
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: 'Invalid communication settings', 
                details: validation.errors 
            });
        }
        
        // Generate hash
        const configHash = generateConfigHash(communication_settings);
        
        // Begin transaction
        const pool = await database.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Check if this is an update or create
            const existingActive = await transaction.request().query(`
                SELECT config_id FROM Universal_Communication_Config WHERE is_active = 1
            `);
            
            if (existingActive.recordset.length > 0) {
                // Deactivate current configuration
                await transaction.request()
                    .input('config_id', existingActive.recordset[0].config_id)
                    .query(`
                        UPDATE Universal_Communication_Config 
                        SET is_active = 0 
                        WHERE config_id = @config_id
                    `);
            }
            
            // Create new configuration
            const result = await transaction.request()
                .input('config_name', 'Direct Update')
                .input('communication_settings', JSON.stringify(communication_settings))
                .input('config_hash', configHash)
                .input('created_by', userId)
                .input('activated_by', userId)
                .input('notes', notes || null)
                .query(`
                    INSERT INTO Universal_Communication_Config (
                        config_name,
                        communication_settings,
                        config_hash,
                        is_active,
                        is_template,
                        created_by,
                        created_at,
                        activated_at,
                        activated_by,
                        notes
                    ) OUTPUT INSERTED.config_id
                    VALUES (
                        @config_name,
                        @communication_settings,
                        @config_hash,
                        1,
                        0,
                        @created_by,
                        GETUTCDATE(),
                        GETUTCDATE(),
                        @activated_by,
                        @notes
                    )
                `);
            
            const newConfigId = result.recordset[0].config_id;
            
            // Log to audit table
            await transaction.request()
                .input('config_id', newConfigId)
                .input('action', 'UPDATE')
                .input('changed_by', userId)
                .input('previous_settings', existingActive.recordset.length > 0 ? 
                    JSON.stringify(communication_settings) : null)
                .input('new_settings', JSON.stringify(communication_settings))
                .query(`
                    INSERT INTO Universal_Comm_Config_Audit (
                        config_id,
                        action,
                        changed_by,
                        changed_at,
                        previous_settings,
                        new_settings
                    ) VALUES (
                        @config_id,
                        @action,
                        @changed_by,
                        GETUTCDATE(),
                        @previous_settings,
                        @new_settings
                    )
                `);
            
            await transaction.commit();
            
            res.json({
                success: true,
                config_id: newConfigId,
                message: 'Universal communication configuration updated successfully'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Error updating universal communication config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

// POST /api/v1/admin/universal-communication/templates
// Save as template
router.post('/templates', [
    body('configuration_name').isString().notEmpty().withMessage('configuration_name is required'),
    body('communication_settings').isObject().withMessage('communication_settings must be an object'),
    body('allowed_users').optional().isArray(),
    body('notes').optional().isString()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { configuration_name, communication_settings, allowed_users, notes } = req.body;
    const userId = req.user.id;
    
    try {
        // Validate communication settings
        const validation = validateCommunicationSettings(communication_settings);
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: 'Invalid communication settings', 
                details: validation.errors 
            });
        }
        
        // Generate hash
        const configHash = generateConfigHash(communication_settings);
        
        // Check if template name already exists
        const existing = await database.query(
            `SELECT config_id FROM Universal_Communication_Config 
             WHERE configuration_name = @configuration_name AND is_template = 1`,
            { configuration_name }
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ 
                error: 'A template with this name already exists' 
            });
        }
        
        // Create template
        const result = await database.query(`
            INSERT INTO Universal_Communication_Config (
                configuration_name,
                communication_settings,
                config_hash,
                is_active,
                is_template,
                can_be_activated_by,
                created_by,
                created_at,
                notes
            ) OUTPUT INSERTED.config_id
            VALUES (
                @configuration_name,
                @communication_settings,
                @config_hash,
                0,
                1,
                @can_be_activated_by,
                @created_by,
                GETUTCDATE(),
                @notes
            )
        `, {
            configuration_name,
            communication_settings: JSON.stringify(communication_settings),
            config_hash: configHash,
            can_be_activated_by: allowed_users ? JSON.stringify(allowed_users) : null,
            created_by: userId,
            notes: notes || null
        });
        
        const newConfigId = result[0].config_id;
        
        // Log to audit
        await database.query(`
            INSERT INTO Universal_Comm_Config_Audit (
                config_id,
                action,
                changed_by,
                changed_at,
                new_settings
            ) VALUES (
                @config_id,
                'TEMPLATE_CREATED',
                @changed_by,
                GETUTCDATE(),
                @new_settings
            )
        `, {
            config_id: newConfigId,
            changed_by: userId,
            new_settings: JSON.stringify(communication_settings)
        });
        
        res.json({
            success: true,
            config_id: newConfigId,
            message: 'Template saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving template:', error);
        res.status(500).json({ error: 'Failed to save template' });
    }
});

// POST /api/v1/admin/universal-communication/activate/:id
// Activate a template
router.post('/activate/:id', [
    param('id').isInt().withMessage('Invalid template ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const templateId = parseInt(req.params.id);
    const userId = req.user.id;
    
    try {
        // Check if template exists
        const template = await database.query(
            `SELECT * FROM Universal_Communication_Config WHERE config_id = @config_id`,
            { config_id: templateId }
        );
        
        if (template.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        const config = template[0];
        
        // Check permissions using stored procedure
        const permissionResult = await database.execute('sp_ValidateUniversalConfigPermission', {
            config_id: templateId,
            user_id: userId,
            permission_type: 'ACTIVATE'
        });
        
        if (!permissionResult || permissionResult.length === 0 || !permissionResult[0].has_permission) {
            return res.status(403).json({ 
                error: 'You do not have permission to activate this configuration' 
            });
        }
        
        // Begin transaction
        const pool = await database.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Deactivate current active configuration
            await transaction.request().query(`
                UPDATE Universal_Communication_Config 
                SET is_active = 0 
                WHERE is_active = 1
            `);
            
            // Activate the selected template
            await transaction.request()
                .input('config_id', templateId)
                .input('activated_by', userId)
                .query(`
                    UPDATE Universal_Communication_Config 
                    SET is_active = 1,
                        activated_at = GETUTCDATE(),
                        activated_by = @activated_by
                    WHERE config_id = @config_id
                `);
            
            // Log to audit
            await transaction.request()
                .input('config_id', templateId)
                .input('changed_by', userId)
                .input('new_settings', config.communication_settings)
                .query(`
                    INSERT INTO Universal_Comm_Config_Audit (
                        config_id,
                        action,
                        changed_by,
                        changed_at,
                        new_settings
                    ) VALUES (
                        @config_id,
                        'ACTIVATED',
                        @changed_by,
                        GETUTCDATE(),
                        @new_settings
                    )
                `);
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: `Configuration "${config.config_name}" activated successfully`
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Error activating template:', error);
        res.status(500).json({ error: 'Failed to activate template' });
    }
});

// DELETE /api/v1/admin/universal-communication/templates/:id
// Delete a template
router.delete('/templates/:id', [
    param('id').isInt().withMessage('Invalid template ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const templateId = parseInt(req.params.id);
    const userId = req.user.id;
    
    try {
        // Check if template exists and is not active
        const template = await database.query(
            `SELECT * FROM Universal_Communication_Config 
             WHERE config_id = @config_id AND is_template = 1`,
            { config_id: templateId }
        );
        
        if (template.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        if (template[0].is_active) {
            return res.status(400).json({ 
                error: 'Cannot delete an active configuration' 
            });
        }
        
        // Begin transaction
        const pool = await database.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Log deletion to audit before deleting
            await transaction.request()
                .input('config_id', templateId)
                .input('changed_by', userId)
                .input('previous_settings', template[0].communication_settings)
                .query(`
                    INSERT INTO Universal_Comm_Config_Audit (
                        config_id,
                        action,
                        changed_by,
                        changed_at,
                        previous_settings
                    ) VALUES (
                        @config_id,
                        'DELETED',
                        @changed_by,
                        GETUTCDATE(),
                        @previous_settings
                    )
                `);
            
            // Delete permissions
            await transaction.request()
                .input('config_id', templateId)
                .query(`
                    DELETE FROM Universal_Config_Permissions 
                    WHERE config_id = @config_id
                `);
            
            // Delete template
            await transaction.request()
                .input('config_id', templateId)
                .query(`
                    DELETE FROM Universal_Communication_Config 
                    WHERE config_id = @config_id
                `);
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: 'Template deleted successfully'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// GET /api/v1/admin/universal-communication/history
// Get configuration history
router.get('/history', async (req, res) => {
    try {
        console.log('=== HISTORY ENDPOINT CALLED ===');
        
        const result = await database.query(`
            SELECT TOP 5
                a.audit_id,
                a.config_id,
                a.action,
                a.changed_by,
                a.changed_at,
                a.previous_settings,
                a.new_settings,
                c.configuration_name,
                u.user_name
            FROM Universal_Comm_Config_Audit a
            LEFT JOIN Universal_Communication_Config c ON a.config_id = c.config_id
            LEFT JOIN users u ON a.changed_by = u.id
            ORDER BY a.changed_at DESC
        `);
        
        console.log('Raw database result:', result);
        
        const history = result.map((row, index) => {
            console.log(`Processing row ${index}:`, {
                audit_id: row.audit_id,
                changed_at: row.changed_at,
                changed_at_type: typeof row.changed_at,
                changed_by: row.changed_by,
                user_name: row.user_name,
                configuration_name: row.configuration_name
            });
            
            // Simple date handling - just use the raw value first
            let formattedDate = row.changed_at;
            if (row.changed_at) {
                try {
                    formattedDate = new Date(row.changed_at).toISOString();
                    console.log(`Date conversion successful: ${row.changed_at} -> ${formattedDate}`);
                } catch (e) {
                    console.log(`Date conversion failed for ${row.changed_at}:`, e.message);
                    formattedDate = String(row.changed_at); // Fallback to string
                }
            }
            
            const historyItem = {
                audit_id: row.audit_id,
                config_id: row.config_id,
                action: row.action,
                previous_endpoint: null, // Frontend expects this
                new_endpoint: null, // Frontend expects this
                changed_by: String(row.changed_by), // Frontend expects string
                changed_by_name: row.user_name || `User ${row.changed_by}` || 'System', // Frontend expects this name
                changed_at: formattedDate, // Frontend expects this name
                is_current: false // Frontend expects this
            };
            
            console.log('Final history item:', historyItem);
            return historyItem;
        });
        
        console.log('Final history array:', history);
        res.json({ history });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

export default router;