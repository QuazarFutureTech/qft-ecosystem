/**
 * ModuleDetailView Component
 * Renders the appropriate module configuration panel based on platform and module ID
 * Integrates existing bot management modules into the new platform-first architecture
 */

import React from 'react';
import CustomCommandBuilderModule from '../CustomCommandBuilderModule';
import AutomodModule from '../AutomodModule';
import WelcomeModule from '../WelcomeModule';
import EnhancedEmbedBuilder from '../EnhancedEmbedBuilder';
import CommandToggleModule from '../CommandToggleModule';
import ScheduledEmbedsModule from '../ScheduledEmbedsModule';
import AutomodRuleTesterModule from '../AutomodRuleTesterModule';
import ModerationQuickActionsModule from '../ModerationQuickActionsModule';
import RolePermissionManagerModule from '../RolePermissionManagerModule';
import BackupsModule from '../BackupsModule';
import WorkerBuilder from '../WorkerBuilder';
import TicketDashboard from '../TicketDashboard';

// Module component mapping
const DISCORD_MODULE_COMPONENTS = {
  'custom-commands': CustomCommandBuilderModule,
  'welcome': WelcomeModule,
  'embeds': EnhancedEmbedBuilder,
  'command-toggle': CommandToggleModule,
  'automod': AutomodModule,
  'automod-tester': AutomodRuleTesterModule,
  'quick-actions': ModerationQuickActionsModule,
  'role-permissions': RolePermissionManagerModule,
  'scheduled-embeds': ScheduledEmbedsModule,
  'workers': WorkerBuilder,
  'tickets': TicketDashboard,
  'backups': BackupsModule
};

const PLATFORM_MODULES = {
  discord: DISCORD_MODULE_COMPONENTS,
  reddit: {},
  youtube: {}
};

function ModuleDetailView({ platform, module }) {
  const platformModules = PLATFORM_MODULES[platform] || {};
  const ModuleComponent = platformModules[module];

  if (!ModuleComponent) {
    return (
      <main className="page-content">
        <div className="qft-card">
          <h2>Module Not Found</h2>
          <p>The requested module "{module}" for {platform} could not be found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-content">
      <ModuleComponent />
    </main>
  );
}

export default ModuleDetailView;
