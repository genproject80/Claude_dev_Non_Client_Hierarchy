/**
 * Check Device Configuration Tables
 * Verify if required tables exist for device configuration management
 */

import dotenv from 'dotenv';
import database from './src/config/database.js';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function checkConfigTables() {
  console.log('\n==================================================');
  console.log('DEVICE CONFIGURATION TABLES CHECK');
  console.log('==================================================\n');

  try {
    await database.connect();

    // Check for all configuration-related tables
    const tableQueries = [
      'Device_Configurations',
      'Device_Config_Audit',
      'Device_Config_Templates'
    ];

    console.log(`${colors.blue}Checking configuration tables...${colors.reset}\n`);

    for (const tableName of tableQueries) {
      const result = await database.query(`
        SELECT COUNT(*) as table_count
        FROM sys.tables
        WHERE name = @tableName
      `, { tableName });

      const exists = result[0].table_count > 0;
      const status = exists ? `${colors.green}✅ EXISTS` : `${colors.red}❌ MISSING`;
      console.log(`  ${tableName}: ${status}${colors.reset}`);

      if (exists) {
        // Get table structure
        const columns = await database.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @tableName
          ORDER BY ORDINAL_POSITION
        `, { tableName });

        console.log(`    Columns: ${columns.map(c => c.COLUMN_NAME).join(', ')}`);
      }
    }

    // Check if any configuration data exists
    const deviceConfigExists = await database.query(`
      SELECT COUNT(*) as table_count
      FROM sys.tables
      WHERE name = 'Device_Configurations'
    `);

    if (deviceConfigExists[0].table_count > 0) {
      console.log(`\n${colors.cyan}Checking existing configuration data...${colors.reset}`);
      const configCount = await database.query('SELECT COUNT(*) as config_count FROM Device_Configurations');
      console.log(`  Total configurations: ${configCount[0].config_count}`);

      if (configCount[0].config_count > 0) {
        const sampleConfigs = await database.query(`
          SELECT TOP 5 config_id, device_id, config_name, is_active, created_at
          FROM Device_Configurations
          ORDER BY created_at DESC
        `);
        console.log('  Recent configurations:');
        sampleConfigs.forEach(config => {
          console.log(`    - ${config.device_id}: ${config.config_name} (${config.is_active ? 'Active' : 'Inactive'})`);
        });
      }
    }

    console.log(`\n${colors.blue}SOLUTION:${colors.reset}`);

    const missingTables = [];
    for (const tableName of tableQueries) {
      const result = await database.query(`
        SELECT COUNT(*) as table_count
        FROM sys.tables
        WHERE name = @tableName
      `, { tableName });
      if (result[0].table_count === 0) {
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      console.log(`${colors.red}Missing tables detected!${colors.reset}`);
      console.log(`${colors.yellow}Required actions:${colors.reset}`);
      console.log('1. Create the missing database tables');
      console.log('2. Run database migration script if available');
      console.log('3. Or manually create tables using SQL scripts');

      console.log(`\n${colors.yellow}SQL to create Device_Configurations table:${colors.reset}`);
      console.log(`
CREATE TABLE Device_Configurations (
    config_id int IDENTITY(1,1) PRIMARY KEY,
    device_id varchar(50) NOT NULL,
    config_name varchar(255) NOT NULL,
    config_data nvarchar(MAX) NOT NULL,
    config_hash varchar(64) NOT NULL,
    config_version int NOT NULL DEFAULT 1,
    is_active bit NOT NULL DEFAULT 0,
    is_deployed bit NOT NULL DEFAULT 0,
    deployment_status varchar(50) DEFAULT 'pending',
    notes nvarchar(1000) NULL,
    created_by int NULL,
    created_at datetime2 DEFAULT GETDATE(),
    activated_at datetime2 NULL,
    deployed_at datetime2 NULL
);

CREATE INDEX IX_Device_Configurations_device_id ON Device_Configurations(device_id);
CREATE INDEX IX_Device_Configurations_is_active ON Device_Configurations(is_active);
      `);
    } else {
      console.log(`${colors.green}All required tables exist!${colors.reset}`);
      console.log('Device configuration functionality should work properly.');
    }

  } catch (error) {
    console.error(`${colors.red}❌ Database check failed:${colors.reset}`, error);
  } finally {
    await database.close();
  }
}

checkConfigTables().catch(console.error);