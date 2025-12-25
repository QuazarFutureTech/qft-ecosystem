// qft-api-gateway/src/db/migrations.js
// Database schema migrations for production modules: commands, tickets, logs, backups, workers

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const syncDatabaseProduction = async () => {
  const client = await pool.connect();
  try {
    // ===== CUSTOM COMMANDS TABLE =====
    // First, create base table structure (backward compatible columns only)
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_commands (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        command_code TEXT NOT NULL,
        description TEXT,
        author_discord_id TEXT NOT NULL,
        permissions_required JSONB,
        sandboxed BOOLEAN DEFAULT true,
        migrated_from TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        
        UNIQUE(guild_id, command_name)
      );
      CREATE INDEX IF NOT EXISTS idx_commands_guild ON custom_commands(guild_id);
      CREATE INDEX IF NOT EXISTS idx_commands_active ON custom_commands(is_active);
    `);

    // Add YAGPDB columns if they don't exist (for existing tables)
    await client.query(`
      DO $$ 
      BEGIN
        -- Add trigger_type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='trigger_type') THEN
          ALTER TABLE custom_commands ADD COLUMN trigger_type TEXT DEFAULT 'command';
          COMMENT ON COLUMN custom_commands.trigger_type IS 'command, contains, regex, slash, button, modal, select_menu';
        END IF;
        
        -- Add trigger_on_edit if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='trigger_on_edit') THEN
          ALTER TABLE custom_commands ADD COLUMN trigger_on_edit BOOLEAN DEFAULT false;
        END IF;
        
        -- Add case_sensitive if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='case_sensitive') THEN
          ALTER TABLE custom_commands ADD COLUMN case_sensitive BOOLEAN DEFAULT false;
        END IF;
        
        -- Add response_type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='response_type') THEN
          ALTER TABLE custom_commands ADD COLUMN response_type TEXT DEFAULT 'text';
        END IF;
        
        -- Add response_in_dm if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='response_in_dm') THEN
          ALTER TABLE custom_commands ADD COLUMN response_in_dm BOOLEAN DEFAULT false;
        END IF;
        
        -- Add delete_trigger if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='delete_trigger') THEN
          ALTER TABLE custom_commands ADD COLUMN delete_trigger BOOLEAN DEFAULT false;
        END IF;
        
        -- Add delete_response if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='delete_response') THEN
          ALTER TABLE custom_commands ADD COLUMN delete_response INTEGER DEFAULT 0;
        END IF;
        
        -- Add cooldown_seconds if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='cooldown_seconds') THEN
          ALTER TABLE custom_commands ADD COLUMN cooldown_seconds INTEGER DEFAULT 0;
        END IF;
        
        -- Add require_roles if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='require_roles') THEN
          ALTER TABLE custom_commands ADD COLUMN require_roles JSONB DEFAULT '[]';
        END IF;
        
        -- Add ignore_roles if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='ignore_roles') THEN
          ALTER TABLE custom_commands ADD COLUMN ignore_roles JSONB DEFAULT '[]';
        END IF;
        
        -- Add require_channels if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='require_channels') THEN
          ALTER TABLE custom_commands ADD COLUMN require_channels JSONB DEFAULT '[]';
        END IF;
        
        -- Add ignore_channels if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='ignore_channels') THEN
          ALTER TABLE custom_commands ADD COLUMN ignore_channels JSONB DEFAULT '[]';
        END IF;
        
        -- Add enabled if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='enabled') THEN
          ALTER TABLE custom_commands ADD COLUMN enabled BOOLEAN DEFAULT true;
        END IF;
        
        -- Add execution_count if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='execution_count') THEN
          ALTER TABLE custom_commands ADD COLUMN execution_count INTEGER DEFAULT 0;
        END IF;
        
        -- Add last_executed_at if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='custom_commands' AND column_name='last_executed_at') THEN
          ALTER TABLE custom_commands ADD COLUMN last_executed_at TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `);

    // Create indexes for new columns (after they're guaranteed to exist)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_commands_trigger_type ON custom_commands(trigger_type);
      CREATE INDEX IF NOT EXISTS idx_commands_enabled ON custom_commands(enabled);
    `);

    // ===== TICKETS TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_discord_id TEXT NOT NULL,
        ticket_number INTEGER NOT NULL,
        thread_id TEXT UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        assigned_to_discord_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP WITH TIME ZONE,
        transcript_url TEXT,
        message_count INTEGER DEFAULT 0,
        UNIQUE(guild_id, ticket_number)
      );
      CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_discord_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    `);

    // ===== TICKET MESSAGES TABLE (Transcript) =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        author_discord_id TEXT NOT NULL,
        author_username TEXT NOT NULL,
        content TEXT,
        attachments JSONB,
        message_discord_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
    `);

    // ===== CHAT MESSAGES TABLE (Channels & DMs) =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room_id TEXT NOT NULL, -- e.g., 'channel:general' or 'dm:user1-user2'
        author_qft_uuid UUID NOT NULL REFERENCES users(qft_uuid),
        content TEXT NOT NULL,
        attachments JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_author ON chat_messages(author_qft_uuid);
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='updated_at') THEN
          ALTER TABLE chat_messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='deleted_at') THEN
          ALTER TABLE chat_messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='is_pinned') THEN
          ALTER TABLE chat_messages ADD COLUMN is_pinned BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);

    // ===== LOGS TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        actor_discord_id TEXT NOT NULL,
        target_discord_id TEXT,
        target_id TEXT,
        details JSONB,
        log_channel_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_logs_guild ON audit_logs(guild_id);
      CREATE INDEX IF NOT EXISTS idx_logs_action ON audit_logs(action_type);
      CREATE INDEX IF NOT EXISTS idx_logs_created ON audit_logs(created_at);
    `);

    // ===== LOG CHANNELS CONFIG =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS log_channels (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        log_categories JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, channel_id)
      );
      CREATE INDEX IF NOT EXISTS idx_log_channels_guild ON log_channels(guild_id);
    `);

    // ===== SERVER BACKUPS TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS server_backups (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        backup_name TEXT NOT NULL,
        backup_data JSONB NOT NULL,
        config_hash TEXT,
        backup_size_bytes INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by_discord_id TEXT,
        is_automated BOOLEAN DEFAULT false,
        restored_at TIMESTAMP WITH TIME ZONE,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_backups_guild ON server_backups(guild_id);
      CREATE INDEX IF NOT EXISTS idx_backups_automated ON server_backups(is_automated);
    `);

    // ===== WORKERS (Zapier-style Workflows) TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        worker_name TEXT NOT NULL,
        description TEXT,
        trigger JSONB NOT NULL,
        actions JSONB NOT NULL,
        lifecycle_state TEXT DEFAULT 'active',
        created_by_discord_id TEXT NOT NULL,
        platforms JSONB DEFAULT '["discord"]',
        execution_count INTEGER DEFAULT 0,
        last_executed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_enabled BOOLEAN DEFAULT true
      );
      CREATE INDEX IF NOT EXISTS idx_workers_guild ON workers(guild_id);
      CREATE INDEX IF NOT EXISTS idx_workers_state ON workers(lifecycle_state);
      CREATE INDEX IF NOT EXISTS idx_workers_enabled ON workers(is_enabled);
    `);

    // ===== WORKER EXECUTION LOG =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS worker_executions (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        trigger_data JSONB,
        action_results JSONB,
        status TEXT,
        error_message TEXT,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_worker_executions_worker ON worker_executions(worker_id);
    `);

    // ===== EMBED TEMPLATES TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS embed_templates (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        template_name TEXT NOT NULL,
        embed_data JSONB NOT NULL,
        author_discord_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(guild_id, template_name)
      );
      CREATE INDEX IF NOT EXISTS idx_embed_templates_guild ON embed_templates(guild_id);
      CREATE INDEX IF NOT EXISTS idx_embed_templates_author ON embed_templates(author_discord_id);
    `);

    // ===== SYNCED ACCOUNTS TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS synced_accounts (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        discord_user_id VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        discriminator VARCHAR(10) DEFAULT '0',
        discord_roles JSONB DEFAULT '[]',
        website_role VARCHAR(50) DEFAULT 'user',
        staff_profile_id INTEGER,
        last_synced_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(guild_id, discord_user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_synced_accounts_guild ON synced_accounts(guild_id);
      CREATE INDEX IF NOT EXISTS idx_synced_accounts_discord_user ON synced_accounts(discord_user_id);
      CREATE INDEX IF NOT EXISTS idx_synced_accounts_staff_profile ON synced_accounts(staff_profile_id);
    `);

    // ===== GUILD SYNC METADATA TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS guild_sync_metadata (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) UNIQUE NOT NULL,
        last_sync_time TIMESTAMP DEFAULT NOW(),
        sync_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_guild_sync_metadata_guild ON guild_sync_metadata(guild_id);
    `);

    // ===== UPDATE WORKERS TABLE FOR LIFECYCLE =====
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workers' 
          AND column_name = 'lifecycle_state'
        ) THEN
          ALTER TABLE workers 
          ADD COLUMN lifecycle_state VARCHAR(50) DEFAULT 'active',
          ADD COLUMN execution_count INTEGER DEFAULT 0,
          ADD COLUMN last_executed_at TIMESTAMP;
          
          CREATE INDEX idx_workers_lifecycle ON workers(lifecycle_state);
        END IF;
      END $$;
    `);

    // ===== ROLES TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        clearance_level VARCHAR(10) NOT NULL,
        color VARCHAR(7),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_roles_clearance ON roles(clearance_level);
    `);

    // ===== PERMISSIONS TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        permission_key VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        label VARCHAR(200) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
    `);

    // ===== ROLE_PERMISSIONS TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(role_id, permission_id)
      );
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
    `);

    // ===== USER_ROLES TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_discord_id TEXT NOT NULL,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        assigned_by TEXT,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_discord_id, role_id)
      );
    `);

    // Migrate old column names if they exist
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'user_id') THEN
          ALTER TABLE user_roles RENAME COLUMN user_id TO user_discord_id;
          ALTER TABLE user_roles ALTER COLUMN user_discord_id TYPE TEXT;
        END IF;
        
        -- Migrate assigned_by from INTEGER to TEXT if needed
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_roles' 
                   AND column_name = 'assigned_by' 
                   AND data_type = 'integer') THEN
          ALTER TABLE user_roles ALTER COLUMN assigned_by TYPE TEXT USING assigned_by::TEXT;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_discord_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
    `);

    // ===== ACTIVITY_LOGS TABLE =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_discord_id TEXT,
        username VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migrate old column name if it exists
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'user_id') THEN
          ALTER TABLE activity_logs RENAME COLUMN user_id TO user_discord_id;
          ALTER TABLE activity_logs ALTER COLUMN user_discord_id TYPE TEXT;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_discord_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
    `);

    // ===== REGISTRY TABLE =====
    // Key-Value registry for channels, roles, users, servers, etc.
    await client.query(`
      CREATE TABLE IF NOT EXISTS registry (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        key VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(type, key)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registry_type ON registry(type);
      CREATE INDEX IF NOT EXISTS idx_registry_key ON registry(key);
      CREATE INDEX IF NOT EXISTS idx_registry_type_key ON registry(type, key);
    `);

    // ===== MODULE MANAGER TABLES =====
    // Pages table - Represents main pages like Bot Management, Command Center, Shop
    await client.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id SERIAL PRIMARY KEY,
        page_key VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Page Categories table - Groupings within pages (e.g., Configuration, Moderation)
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_categories (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        category_key VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_id, category_key)
      );
    `);

    // Page Modules table - Individual modules within categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_modules (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES page_categories(id) ON DELETE CASCADE,
        module_key VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        component_name VARCHAR(255),
        icon VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT true,
        configuration JSONB DEFAULT '{}',
        required_clearance VARCHAR(10),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id, module_key)
      );
    `);

    // Create indexes for module manager
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pages_enabled ON pages(enabled);
      CREATE INDEX IF NOT EXISTS idx_pages_order ON pages(display_order);
      CREATE INDEX IF NOT EXISTS idx_categories_page ON page_categories(page_id);
      CREATE INDEX IF NOT EXISTS idx_categories_enabled ON page_categories(enabled);
      CREATE INDEX IF NOT EXISTS idx_modules_category ON page_modules(category_id);
      CREATE INDEX IF NOT EXISTS idx_modules_enabled ON page_modules(enabled);
    `);

    // Insert default permissions if not exists
    await client.query(`
      INSERT INTO permissions (permission_key, category, label, description) VALUES
        ('view_dashboard', 'general', 'View Dashboard', 'Access the main dashboard'),
        ('view_analytics', 'general', 'View Analytics', 'View system analytics and reports'),
        ('view_shop', 'general', 'Access Shop', 'Browse and purchase from the shop'),
        ('command_center', 'staff', 'Command Center Access', 'Access staff command center'),
        ('manage_tasks', 'staff', 'Manage Tasks', 'Create and assign tasks'),
        ('view_team', 'staff', 'View Team', 'See team roster and schedules'),
        ('view_reports', 'staff', 'View Reports', 'Access staff reports and KPIs'),
        ('control_panel', 'privileged', 'Control Panel Access', 'Access system control panel'),
        ('manage_users', 'privileged', 'Manage Users', 'Create, edit, and delete users'),
        ('manage_permissions', 'privileged', 'Manage Permissions', 'Assign roles and clearances'),
        ('manage_bot', 'privileged', 'Bot Management', 'Control Discord bot settings'),
        ('view_logs', 'privileged', 'View System Logs', 'Access system audit logs'),
        ('system_settings', 'privileged', 'System Settings', 'Modify system configuration'),
        ('database_access', 'advanced', 'Database Access', 'Direct database operations'),
        ('api_keys', 'advanced', 'API Key Management', 'Generate and revoke API keys'),
        ('deployment', 'advanced', 'Deployment Control', 'Deploy system updates'),
        ('security_override', 'advanced', 'Security Override', 'Bypass security restrictions')
      ON CONFLICT (permission_key) DO NOTHING;
    `);

    // Insert default roles if not exists
    await client.query(`
      INSERT INTO roles (name, clearance_level, color, description) VALUES
        ('Admin', 'α', '#dc143c', 'System administrator with full access'),
        ('Owner', 'α', '#ff0000', 'Full system access'),
        ('Executive', 'Ω', '#ff6600', 'Executive management'),
        ('Management', '3', '#ffcc00', 'Management team'),
        ('Security', '2', '#00ccff', 'Security personnel'),
        ('IT Staff', '1', '#00ff00', 'IT department'),
        ('Staff', '0', '#999999', 'General staff'),
        ('Client', '0', '#9b59b6', 'Client accounts'),
        ('Affiliate', '0', '#3498db', 'Affiliate partners')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('✅ Production database migrations completed (including permissions & logging)');
    await client.release();
  } catch (error) {
    console.error('❌ Migration error:', error);
    await client.release();
    throw error;
  }
};

module.exports = { syncDatabaseProduction };
