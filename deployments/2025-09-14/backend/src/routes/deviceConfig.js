import express from 'express';
import { query, param, body, validationResult } from 'express-validator';
import database from '../config/database.js';
import { authenticateToken, requireAdmin, requireUserOrAdmin } from '../middleware/auth.js';
import { addDataFilter, requireDataAccess, addClientFilterToQuery } from '../middleware/dataFilter.js';
import crypto from 'crypto';

const router = express.Router();

// Apply authentication to all device config routes
router.use(authenticateToken);

/**
 * Configuration validation utilities
 */

// JSON schema validation for configuration data
const validateConfigurationJSON = (configData) => {
  try {
    const parsed = JSON.parse(configData);
    
    // Basic validation - just ensure it's valid JSON and not empty
    if (typeof parsed !== 'object' || parsed === null) {
      return { valid: false, error: 'Configuration must be a valid JSON object' };
    }
    
    // Optional: Check for common fields but don't require them
    if (parsed.deviceType && !['P1', 'P2', 'Generic'].includes(parsed.deviceType)) {
      return { valid: false, error: 'deviceType must be P1, P2, or Generic' };
    }
    
    return { valid: true, parsed };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON format: ' + error.message };
  }
};

// Generate configuration hash for version checking
const generateConfigHash = (configData) => {
  return crypto.createHash('sha256').update(configData).digest('hex');
};

/**
 * Audit trail utilities
 */
const logConfigurationAction = async (configId, action, userId, previousData, newData, changeReason, ipAddress, userAgent) => {
  try {
    await database.query(`
      INSERT INTO Device_Config_Audit (
        config_id, action, previous_config_data, new_config_data,
        user_id, timestamp, ip_address, user_agent, change_reason
      ) VALUES (
        @configId, @action, @previousData, @newData,
        @userId, GETDATE(), @ipAddress, @userAgent, @changeReason
      )
    `, {
      configId,
      action,
      previousData: previousData || null,
      newData: newData || null,
      userId,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      changeReason: changeReason || null
    });
  } catch (error) {
    console.error('Failed to log configuration audit:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
};

/**
 * ADMIN CONFIGURATION MANAGEMENT ROUTES
 * For web interface administration
 */

// Get all device configurations with filtering and pagination
router.get('/admin/configs', [
  requireAdmin,
  addDataFilter,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('deviceId').optional().isString().trim(),
  query('status').optional().isIn(['active', 'inactive', 'all'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 20, deviceId, status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    const { dataFilter } = req;

    // Build base query
    let baseQuery = `
      SELECT 
        dc.config_id,
        dc.device_id,
        dc.config_version,
        dc.config_name,
        dc.config_data,
        dc.config_hash,
        dc.config_schema_version,
        dc.is_active,
        dc.is_deployed,
        dc.deployment_status,
        dc.created_at,
        dc.activated_at,
        dc.notes,
        d.client_id,
        u_created.user_name as created_by_name,
        u_activated.user_name as activated_by_name,
        LEFT(dc.config_hash, 8) as config_hash_short
      FROM Device_Configurations dc
      LEFT JOIN device d ON dc.device_id = d.Device_ID
      LEFT JOIN users u_created ON dc.created_by = u_created.id
      LEFT JOIN users u_activated ON dc.activated_by = u_activated.id
    `;

    let whereConditions = [];
    const params = {};

    // Add device filter if specified
    if (deviceId) {
      whereConditions.push('dc.device_id = @deviceId');
      params.deviceId = deviceId;
    }

    // Add status filter
    if (status === 'active') {
      whereConditions.push('dc.is_active = 1');
    } else if (status === 'inactive') {
      whereConditions.push('dc.is_active = 0');
    }

    // Add client filtering for non-admin users (though this is admin-only route)
    if (!dataFilter.isAdmin) {
      const { whereClause: clientFilter, params: clientParams } = dataFilter.buildClientFilter('d');
      whereConditions.push(clientFilter);
      Object.assign(params, clientParams);
    }

    // Combine WHERE conditions
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Get total count
    const countQuery = baseQuery.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await database.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Add pagination and ordering
    const finalQuery = `
      ${baseQuery}
      ORDER BY dc.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const configs = await database.query(finalQuery, {
      ...params,
      offset,
      limit
    });

    res.json({
      success: true,
      data: configs.map(config => ({
        configId: config.config_id,
        deviceId: config.device_id,
        configVersion: config.config_version,
        configName: config.config_name,
        configData: JSON.parse(config.config_data),
        configHash: config.config_hash,
        schemaVersion: config.config_schema_version,
        isActive: config.is_active,
        isDeployed: config.is_deployed,
        deploymentStatus: config.deployment_status,
        createdAt: config.created_at,
        activatedAt: config.activated_at,
        notes: config.notes,
        clientId: config.client_id,
        createdByName: config.created_by_name,
        activatedByName: config.activated_by_name,
        configHashShort: config.config_hash_short
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching device configurations:', error);
    res.status(500).json({ error: 'Failed to fetch device configurations' });
  }
});

// Get active configuration for a specific device
router.get('/admin/configs/:deviceId', [
  requireAdmin,
  addDataFilter,
  param('deviceId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { dataFilter } = req;

    // Build query with client filtering
    let query = `
      SELECT 
        dc.config_id,
        dc.device_id,
        dc.config_version,
        dc.config_name,
        dc.config_data,
        dc.config_hash,
        dc.config_schema_version,
        dc.is_active,
        dc.is_deployed,
        dc.deployment_status,
        dc.created_at,
        dc.activated_at,
        dc.activated_by,
        dc.notes,
        d.client_id,
        u_created.user_name as created_by_name,
        u_activated.user_name as activated_by_name
      FROM Device_Configurations dc
      LEFT JOIN device d ON dc.device_id = d.Device_ID
      LEFT JOIN users u_created ON dc.created_by = u_created.id
      LEFT JOIN users u_activated ON dc.activated_by = u_activated.id
      WHERE dc.device_id = @deviceId AND dc.is_active = 1
    `;

    const params = { deviceId };

    // Add client filtering for non-admin users
    if (!dataFilter.isAdmin) {
      const { whereClause: clientFilter, params: clientParams } = dataFilter.buildClientFilter('d');
      query += ` AND ${clientFilter}`;
      Object.assign(params, clientParams);
    }

    const configs = await database.query(query, params);

    if (!configs || configs.length === 0) {
      return res.status(404).json({ error: 'No active configuration found for device' });
    }

    const config = configs[0];

    res.json({
      success: true,
      data: {
        configId: config.config_id,
        deviceId: config.device_id,
        configVersion: config.config_version,
        configName: config.config_name,
        configData: JSON.parse(config.config_data),
        configHash: config.config_hash,
        schemaVersion: config.config_schema_version,
        isActive: config.is_active,
        isDeployed: config.is_deployed,
        deploymentStatus: config.deployment_status,
        createdAt: config.created_at,
        activatedAt: config.activated_at,
        notes: config.notes,
        clientId: config.client_id,
        createdByName: config.created_by_name,
        activatedByName: config.activated_by_name
      }
    });

  } catch (error) {
    console.error('Error fetching device configuration:', error);
    res.status(500).json({ error: 'Failed to fetch device configuration' });
  }
});

// Create new device configuration
router.post('/admin/configs/:deviceId', [
  requireAdmin,
  addDataFilter,
  param('deviceId').isString().notEmpty(),
  body('config_name').isString().isLength({ min: 1, max: 255 }).trim(),
  body('config_data').notEmpty(),
  body('notes').optional().isString().isLength({ max: 1000 }).trim(),
  body('changeReason').optional().isString().isLength({ max: 500 }).trim()
], async (req, res) => {
  try {
    console.log(`📝 Create Config Request - Device ID: ${req.params.deviceId}`);
    console.log(`👤 User: ${req.user?.id || 'Unknown'} (${req.user?.role || 'Unknown role'})`);
    console.log(`📋 Request Body:`, {
      config_name: req.body.config_name,
      config_data_type: typeof req.body.config_data,
      config_data_length: req.body.config_data?.length || 0,
      notes: req.body.notes || 'None'
    });

    // Check if Device_Configurations table exists
    console.log('🔍 Checking Device_Configurations table...');
    const configTableCheck = await database.query("SELECT COUNT(*) as table_count FROM sys.tables WHERE name = 'Device_Configurations'");
    const configTableExists = configTableCheck[0].table_count > 0;

    console.log(`📊 Device_Configurations table exists: ${configTableExists}`);

    if (!configTableExists) {
      console.log('❌ Device_Configurations table not found - returning 501');
      return res.status(501).json({
        success: false,
        error: 'Configuration management not yet available. Database tables need to be created.',
        details: 'The Device_Configurations table does not exist. Please run the database migration to create the required tables.'
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { config_name: configName, config_data, notes, changeReason } = req.body;
    
    // Ensure config_data is a string (JSON)
    const configData = typeof config_data === 'string' ? config_data : JSON.stringify(config_data);
    const { dataFilter } = req;

    // Validate device exists and user has access
    let deviceQuery = 'SELECT Device_ID, client_id FROM device WHERE Device_ID = @deviceId';
    const deviceParams = { deviceId };

    if (!dataFilter.isAdmin) {
      const { whereClause: clientFilter, params: clientParams } = dataFilter.buildClientFilter();
      deviceQuery += ` AND ${clientFilter}`;
      Object.assign(deviceParams, clientParams);
    }

    const devices = await database.query(deviceQuery, deviceParams);
    if (!devices || devices.length === 0) {
      return res.status(404).json({ error: 'Device not found or access denied' });
    }

    // Validate configuration JSON
    const validation = validateConfigurationJSON(configData);
    if (!validation.valid) {
      return res.status(400).json({ error: `Invalid configuration: ${validation.error}` });
    }

    // Generate configuration hash
    const configHash = generateConfigHash(configData);

    // Get next version number for this device
    const versionResult = await database.query(
      'SELECT ISNULL(MAX(config_version), 0) + 1 as next_version FROM Device_Configurations WHERE device_id = @deviceId',
      { deviceId }
    );
    const configVersion = versionResult[0]?.next_version || 1;

    // Insert new configuration
    const result = await database.query(`
      INSERT INTO Device_Configurations (
        device_id, config_version, config_name, config_data, config_hash,
        config_schema_version, is_active, is_deployed, deployment_status,
        created_by, created_at, notes
      )
      OUTPUT INSERTED.config_id
      VALUES (
        @deviceId, @configVersion, @configName, @configData, @configHash,
        '1.0', 0, 0, 'pending',
        @userId, GETDATE(), @notes
      )
    `, {
      deviceId,
      configVersion,
      configName,
      configData,
      configHash,
      userId: req.user.id,
      notes: notes || null
    });

    if (!result || result.length === 0) {
      return res.status(500).json({ error: 'Failed to create configuration' });
    }

    const configId = result[0].config_id;

    // Log audit trail
    await logConfigurationAction(
      configId,
      'CREATE',
      req.user.id,
      null,
      configData,
      changeReason,
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Configuration created successfully',
      data: {
        configId,
        deviceId,
        configVersion,
        configName,
        configHash,
        isActive: false,
        isDeployed: false,
        deploymentStatus: 'pending'
      }
    });

  } catch (error) {
    console.error('Error creating device configuration:', error);
    res.status(500).json({ error: 'Failed to create device configuration' });
  }
});

// Activate a device configuration
router.post('/admin/configs/:deviceId/activate', [
  requireAdmin,
  addDataFilter,
  param('deviceId').isString().notEmpty(),
  body('configId').isInt().toInt(),
  body('changeReason').optional().isString().isLength({ max: 500 }).trim()
], async (req, res) => {
  try {
    console.log('Activation request:', { deviceId: req.params.deviceId, configId: req.body.configId, userId: req.user?.id });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { configId, changeReason } = req.body;
    const { dataFilter } = req;

    // Check if Device_Configurations table exists first
    const tableExists = await database.query(`
      SELECT COUNT(*) as table_count
      FROM sys.tables 
      WHERE name = 'Device_Configurations'
    `);
    
    console.log('Device_Configurations table exists:', tableExists[0]?.table_count > 0);
    
    if (!tableExists[0]?.table_count) {
      console.log('Device_Configurations table does not exist');
      return res.status(500).json({ error: 'Configuration tables not initialized. Please run database migration.' });
    }

    // Verify config exists and belongs to the device with access check
    let configQuery = `
      SELECT dc.config_id, dc.config_data, dc.is_active
      FROM Device_Configurations dc
      LEFT JOIN device d ON dc.device_id = d.Device_ID
      WHERE dc.config_id = @configId AND dc.device_id = @deviceId
    `;
    
    const configParams = { configId, deviceId };

    if (!dataFilter.isAdmin) {
      const { whereClause: clientFilter, params: clientParams } = dataFilter.buildClientFilter('d');
      configQuery += ` AND ${clientFilter}`;
      Object.assign(configParams, clientParams);
    }

    const configs = await database.query(configQuery, configParams);
    console.log('Found configs:', configs);
    if (!configs || configs.length === 0) {
      console.log('No configurations found for:', { configId, deviceId });
      return res.status(404).json({ error: 'Configuration not found or access denied' });
    }

    if (configs[0].is_active) {
      console.log('Configuration is already active:', configId);
      return res.status(400).json({ error: 'Configuration is already active' });
    }

    // Get currently active config for audit trail
    const currentActiveConfig = await database.query(
      'SELECT config_id, config_data FROM Device_Configurations WHERE device_id = @deviceId AND is_active = 1',
      { deviceId }
    );

    // Deactivate all current configurations for this device
    console.log('Deactivating existing configs for device:', deviceId);
    const deactivateResult = await database.query(
      'UPDATE Device_Configurations SET is_active = 0 WHERE device_id = @deviceId',
      { deviceId }
    );
    console.log('Deactivate result:', deactivateResult);

    // Activate the selected configuration
    console.log('Activating config:', { configId, userId: req.user.id });
    const activateResult = await database.query(`
      UPDATE Device_Configurations 
      SET is_active = 1, activated_at = GETDATE(), activated_by = @userId
      WHERE config_id = @configId
    `, {
      configId,
      userId: req.user.id
    });
    console.log('Activate result:', activateResult);

    // Log audit trail for activation
    await logConfigurationAction(
      configId,
      'ACTIVATE',
      req.user.id,
      currentActiveConfig[0]?.config_data || null,
      configs[0].config_data,
      changeReason,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Configuration activated successfully'
    });

  } catch (error) {
    console.error('Error activating configuration:', error);
    res.status(500).json({ error: 'Failed to activate configuration' });
  }
});

// Get deployment status for devices
router.get('/admin/deployments', [
  requireAdmin,
  addDataFilter,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['pending', 'success', 'failed', 'in_progress', 'all'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 20, status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    const { dataFilter } = req;

    // Build query
    let baseQuery = `
      SELECT 
        dcd.deployment_id,
        dcd.config_id,
        dcd.device_id,
        dcd.deployment_status,
        dcd.initiated_at,
        dcd.completed_at,
        dcd.error_message,
        dcd.retry_count,
        dcd.deployment_method,
        d.client_id,
        dc.config_name,
        dc.config_version,
        u.user_name as initiated_by_name
      FROM Device_Config_Deployments dcd
      LEFT JOIN Device_Configurations dc ON dcd.config_id = dc.config_id
      LEFT JOIN device d ON dcd.device_id = d.Device_ID
      LEFT JOIN users u ON dcd.initiated_by = u.id
    `;

    let whereConditions = [];
    const params = {};

    // Add status filter
    if (status !== 'all') {
      whereConditions.push('dcd.deployment_status = @status');
      params.status = status;
    }

    // Add client filtering for non-admin users
    if (!dataFilter.isAdmin) {
      const { whereClause: clientFilter, params: clientParams } = dataFilter.buildClientFilter('d');
      whereConditions.push(clientFilter);
      Object.assign(params, clientParams);
    }

    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Get total count
    const countQuery = baseQuery.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await database.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Add pagination and ordering
    const finalQuery = `
      ${baseQuery}
      ORDER BY dcd.initiated_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const deployments = await database.query(finalQuery, {
      ...params,
      offset,
      limit
    });

    res.json({
      success: true,
      data: deployments.map(deploy => ({
        deploymentId: deploy.deployment_id,
        configId: deploy.config_id,
        deviceId: deploy.device_id,
        configName: deploy.config_name,
        configVersion: deploy.config_version,
        deploymentStatus: deploy.deployment_status,
        initiatedAt: deploy.initiated_at,
        completedAt: deploy.completed_at,
        errorMessage: deploy.error_message,
        retryCount: deploy.retry_count,
        deploymentMethod: deploy.deployment_method,
        clientId: deploy.client_id,
        initiatedByName: deploy.initiated_by_name
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// Deploy configuration to device
router.post('/admin/deployments/:deviceId/deploy', [
  requireAdmin,
  addDataFilter,
  param('deviceId').isString().notEmpty(),
  body('configId').optional().isInt().toInt() // Optional - if not provided, deploys active config
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { configId } = req.body;
    const { dataFilter } = req;

    // Determine which config to deploy
    let targetConfigId = configId;
    if (!targetConfigId) {
      // Deploy active configuration
      const activeConfig = await database.query(
        'SELECT config_id FROM Device_Configurations WHERE device_id = @deviceId AND is_active = 1',
        { deviceId }
      );
      
      if (!activeConfig || activeConfig.length === 0) {
        return res.status(400).json({ error: 'No active configuration found for device' });
      }
      
      targetConfigId = activeConfig[0].config_id;
    }

    // Verify config exists and user has access
    let configQuery = `
      SELECT dc.config_id
      FROM Device_Configurations dc
      LEFT JOIN device d ON dc.device_id = d.Device_ID
      WHERE dc.config_id = @configId AND dc.device_id = @deviceId
    `;
    
    const configParams = { configId: targetConfigId, deviceId };

    if (!dataFilter.isAdmin) {
      const { whereClause: clientFilter, params: clientParams } = dataFilter.buildClientFilter('d');
      configQuery += ` AND ${clientFilter}`;
      Object.assign(configParams, clientParams);
    }

    const configs = await database.query(configQuery, configParams);
    if (!configs || configs.length === 0) {
      return res.status(404).json({ error: 'Configuration not found or access denied' });
    }

    // Create deployment record
    const deploymentResult = await database.query(`
      INSERT INTO Device_Config_Deployments (
        config_id, device_id, deployment_status, initiated_by, initiated_at, deployment_method
      )
      OUTPUT INSERTED.deployment_id
      VALUES (
        @configId, @deviceId, 'pending', @userId, GETDATE(), 'api'
      )
    `, {
      configId: targetConfigId,
      deviceId,
      userId: req.user.id
    });

    if (!deploymentResult || deploymentResult.length === 0) {
      return res.status(500).json({ error: 'Failed to create deployment record' });
    }

    const deploymentId = deploymentResult[0].deployment_id;

    // In a real implementation, here you would trigger the actual deployment process
    // For now, we'll just mark it as pending and let the device poll for updates

    res.status(201).json({
      success: true,
      message: 'Deployment initiated successfully',
      data: {
        deploymentId,
        configId: targetConfigId,
        deviceId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error deploying configuration:', error);
    res.status(500).json({ error: 'Failed to deploy configuration' });
  }
});

/**
 * ULTRA-LIGHTWEIGHT DEVICE API ROUTES
 * Optimized for IoT device constraints (minimal bandwidth)
 */

// Ultra-lightweight version check API - returns only short hash (< 10 bytes)
router.get('/device/version/:deviceId', [
  param('deviceId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;

    // Get active configuration hash for the device
    const result = await database.query(`
      SELECT LEFT(config_hash, 8) as version_hash
      FROM Device_Configurations 
      WHERE device_id = @deviceId AND is_active = 1
    `, { deviceId });

    // Return plain text response to minimize overhead
    res.set('Content-Type', 'text/plain');
    res.send(result[0]?.version_hash || 'none');

  } catch (error) {
    console.error('Error checking config version:', error);
    res.status(500).send('error');
  }
});

// Configuration download API - returns full configuration JSON
router.get('/device/config/:deviceId', [
  param('deviceId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;

    // Get active configuration for the device
    const result = await database.query(`
      SELECT 
        config_id,
        config_data,
        config_hash,
        config_version,
        config_name
      FROM Device_Configurations 
      WHERE device_id = @deviceId AND is_active = 1
    `, { deviceId });

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'No active configuration found' });
    }

    const config = result[0];

    // Parse and return configuration data with minimal metadata
    const configData = JSON.parse(config.config_data);
    
    res.json({
      id: config.config_id,
      version: config.config_version,
      hash: config.config_hash,
      name: config.config_name,
      data: configData
    });

  } catch (error) {
    console.error('Error fetching device config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Device status reporting API - for deployment feedback
router.post('/device/status/:deviceId', [
  param('deviceId').isString().notEmpty(),
  body('configId').isInt().toInt(),
  body('status').isIn(['success', 'failed', 'in_progress']),
  body('error').optional().isString().isLength({ max: 1000 }).trim(),
  body('deploymentId').optional().isInt().toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { configId, status, error, deploymentId } = req.body;

    // If deployment ID is provided, update that specific deployment
    if (deploymentId) {
      await database.query(`
        UPDATE Device_Config_Deployments 
        SET 
          deployment_status = @status,
          completed_at = CASE WHEN @status IN ('success', 'failed') THEN GETDATE() ELSE completed_at END,
          error_message = @error
        WHERE deployment_id = @deploymentId 
          AND device_id = @deviceId 
          AND config_id = @configId
      `, {
        status,
        error: error || null,
        deploymentId,
        deviceId,
        configId
      });
    } else {
      // Update the most recent deployment for this device/config
      await database.query(`
        UPDATE Device_Config_Deployments 
        SET 
          deployment_status = @status,
          completed_at = CASE WHEN @status IN ('success', 'failed') THEN GETDATE() ELSE completed_at END,
          error_message = @error
        WHERE config_id = @configId 
          AND device_id = @deviceId 
          AND deployment_id = (
            SELECT TOP 1 deployment_id 
            FROM Device_Config_Deployments 
            WHERE config_id = @configId AND device_id = @deviceId 
            ORDER BY initiated_at DESC
          )
      `, {
        status,
        error: error || null,
        configId,
        deviceId
      });
    }

    // If deployment was successful, mark configuration as deployed
    if (status === 'success') {
      await database.query(`
        UPDATE Device_Configurations 
        SET is_deployed = 1, deployment_status = 'deployed'
        WHERE config_id = @configId AND device_id = @deviceId
      `, { configId, deviceId });
    }

    // Return minimal response
    res.json({ success: true });

  } catch (error) {
    console.error('Error updating device status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * AUDIT TRAIL AND HISTORY ENDPOINTS
 */

// Get configuration history for a device
router.get('/admin/configs/:deviceId/history', [
  requireAdmin,
  addDataFilter,
  param('deviceId').isString().notEmpty(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { dataFilter } = req;

    // Build query with client filtering
    let baseQuery = `
      SELECT 
        dc.config_id,
        dc.config_version,
        dc.config_name,
        dc.is_active,
        dc.is_deployed,
        dc.deployment_status,
        dc.created_at,
        dc.activated_at,
        dc.notes,
        LEFT(dc.config_hash, 8) as config_hash_short,
        u_created.user_name as created_by_name,
        u_activated.user_name as activated_by_name
      FROM Device_Configurations dc
      LEFT JOIN device d ON dc.device_id = d.Device_ID
      LEFT JOIN users u_created ON dc.created_by = u_created.id
      LEFT JOIN users u_activated ON dc.activated_by = u_activated.id
      WHERE dc.device_id = @deviceId
    `;

    const params = { deviceId };

    // Add client filtering for non-admin users
    if (!dataFilter.isAdmin) {
      const { whereClause: clientFilter, params: clientParams } = dataFilter.buildClientFilter('d');
      baseQuery += ` AND ${clientFilter}`;
      Object.assign(params, clientParams);
    }

    // Get total count
    const countQuery = baseQuery.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await database.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Add pagination and ordering
    const finalQuery = `
      ${baseQuery}
      ORDER BY dc.config_version DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const history = await database.query(finalQuery, {
      ...params,
      offset,
      limit
    });

    res.json({
      success: true,
      data: history.map(config => ({
        configId: config.config_id,
        configVersion: config.config_version,
        configName: config.config_name,
        isActive: config.is_active,
        isDeployed: config.is_deployed,
        deploymentStatus: config.deployment_status,
        createdAt: config.created_at,
        activatedAt: config.activated_at,
        notes: config.notes,
        configHashShort: config.config_hash_short,
        createdByName: config.created_by_name,
        activatedByName: config.activated_by_name
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching configuration history:', error);
    res.status(500).json({ error: 'Failed to fetch configuration history' });
  }
});

// Get audit trail for configuration changes
router.get('/admin/audit/:configId', [
  requireAdmin,
  param('configId').isInt().toInt(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { configId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get audit trail
    const auditQuery = `
      SELECT 
        dca.audit_id,
        dca.action,
        dca.timestamp,
        dca.ip_address,
        dca.change_reason,
        u.user_name,
        u.email
      FROM Device_Config_Audit dca
      LEFT JOIN users u ON dca.user_id = u.id
      WHERE dca.config_id = @configId
      ORDER BY dca.timestamp DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Device_Config_Audit 
      WHERE config_id = @configId
    `;

    const [auditEntries, countResult] = await Promise.all([
      database.query(auditQuery, { configId, offset, limit }),
      database.query(countQuery, { configId })
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: auditEntries.map(entry => ({
        auditId: entry.audit_id,
        action: entry.action,
        timestamp: entry.timestamp,
        userName: entry.user_name,
        userEmail: entry.email,
        ipAddress: entry.ip_address,
        changeReason: entry.change_reason
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// Get configuration templates
router.get('/admin/templates', [
  requireAdmin,
  query('category').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category } = req.query;

    // Check if table exists first, then build appropriate query
    const tableCheck = await database.query("SELECT COUNT(*) as table_count FROM sys.tables WHERE name = 'Device_Config_Templates'");
    const tableExists = tableCheck[0].table_count > 0;

    let templates = [];
    
    if (tableExists) {
      // Build query for templates from actual table
      let templateQuery = `
        SELECT 
          template_id,
          template_name,
          ISNULL(template_description, template_name) as description,
          template_data,
          ISNULL(device_type, 'General') as category,
          is_active,
          created_at
        FROM Device_Config_Templates
        WHERE is_active = 1
      `;

      const params = {};

      if (category) {
        templateQuery += ` AND ISNULL(device_type, 'General') = @category`;
        params.category = category;
      }

      templateQuery += ` ORDER BY template_name ASC`;
      
      templates = await database.query(templateQuery, params);
    } else {
      // Return empty array when table doesn't exist
      templates = [];
    }

    res.json({
      success: true,
      data: templates.map(template => ({
        template_id: template.template_id,
        template_name: template.template_name,
        description: template.description,
        template_data: JSON.parse(template.template_data),
        category: template.category,
        is_active: template.is_active,
        created_at: template.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching configuration templates:', error);
    res.status(500).json({ error: 'Failed to fetch configuration templates' });
  }
});

// Get all devices with their configuration status
router.get('/admin/devices/status', [
  requireAdmin,
  addDataFilter
], async (req, res) => {
  try {
    const { dataFilter } = req;

    // Check if Device_Configurations table exists
    const configTableCheck = await database.query("SELECT COUNT(*) as table_count FROM sys.tables WHERE name = 'Device_Configurations'");
    const configTableExists = configTableCheck[0].table_count > 0;

    let baseQuery;
    
    if (configTableExists) {
      // Build query with configuration data
      baseQuery = `
        SELECT 
          d.Device_ID as device_id,
          d.client_id,
          dc.config_id,
          dc.config_name,
          dc.config_version,
          dc.deployment_status,
          dc.activated_at,
          (
            SELECT COUNT(*) 
            FROM Device_Configurations dc2 
            WHERE dc2.device_id = d.Device_ID
          ) as total_configs,
          ISNULL(dc.activated_at, GETDATE()) as last_updated
        FROM device d
        LEFT JOIN Device_Configurations dc ON d.Device_ID = dc.device_id AND dc.is_active = 1
      `;
    } else {
      // Build query without configuration data
      baseQuery = `
        SELECT 
          d.Device_ID as device_id,
          d.client_id,
          NULL as config_id,
          NULL as config_name,
          NULL as config_version,
          NULL as deployment_status,
          NULL as activated_at,
          0 as total_configs,
          GETDATE() as last_updated
        FROM device d
      `;
    }

    const params = {};

    // Add client filtering for non-admin users
    if (!dataFilter.isAdmin) {
      const { whereClause: clientFilter, params: clientParams } = dataFilter.buildClientFilter('d');
      baseQuery += ` WHERE ${clientFilter}`;
      Object.assign(params, clientParams);
    }

    baseQuery += ` ORDER BY d.Device_ID ASC`;

    const devices = await database.query(baseQuery, params);

    res.json({
      success: true,
      data: devices.map(device => ({
        device_id: device.device_id,
        client_id: device.client_id,
        active_config: device.config_id ? {
          config_id: device.config_id,
          config_name: device.config_name,
          config_version: device.config_version,
          deployment_status: device.deployment_status,
          activated_at: device.activated_at
        } : null,
        total_configs: device.total_configs,
        last_updated: device.last_updated
      }))
    });

  } catch (error) {
    console.error('Error fetching devices with configuration status:', error);
    res.status(500).json({ error: 'Failed to fetch devices with configuration status' });
  }
});

// GET /api/v1/device-config/admin/device/:deviceId/details
// Fetch device with ThingSpeak data for Config Builder
router.get('/admin/device/:deviceId/details', [
  requireAdmin,
  param('deviceId').isString().notEmpty()
], async (req, res) => {
  try {
    console.log(`📡 Device Details Request - Device ID: ${req.params.deviceId}`);
    console.log(`👤 User: ${req.user?.id || 'Unknown'} (${req.user?.role || 'Unknown role'})`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;

    console.log(`🔍 Querying database for device: ${deviceId}`);

    // Query Device table for ThingSpeak info
    const result = await database.query(`
      SELECT
        Device_ID,
        Channel_ID,
        Field_ID,
        APIKey,
        client_id,
        ConversionLogicID
      FROM device
      WHERE Device_ID = @deviceId
    `, { deviceId });

    console.log(`📊 Query result: ${result.length} records found`);

    if (!result || result.length === 0) {
      console.log(`❌ Device ${deviceId} not found in database`);
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = {
      device_id: result[0].Device_ID,
      channel_id: result[0].Channel_ID,
      field_id: result[0].Field_ID,
      api_key: result[0].APIKey,
      client_id: result[0].client_id,
      conversion_logic_id: result[0].ConversionLogicID
    };

    console.log(`✅ Device details found:`, {
      device_id: deviceData.device_id,
      channel_id: deviceData.channel_id,
      field_id: deviceData.field_id,
      api_key: deviceData.api_key ? '***' + deviceData.api_key.slice(-4) : 'NULL',
      client_id: deviceData.client_id,
      conversion_logic_id: deviceData.conversion_logic_id
    });

    res.json({
      success: true,
      data: deviceData
    });

  } catch (error) {
    console.error('❌ Error fetching device details:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      state: error.state,
      stack: error.stack?.split('\n')[0]
    });
    res.status(500).json({ error: 'Failed to fetch device details' });
  }
});

export default router;