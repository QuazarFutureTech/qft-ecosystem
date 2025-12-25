import React from 'react';
import PlatformSelector from '../components/modules/ai-modules/PlatformSelector';
import ModuleList from '../components/modules/ai-modules/ModuleList';
import { AI_MODULES_CONTEXT } from '../utils/aiModulesConstants.js';

function AiModulesSmartNav({
  currentContext,
  platform,
  module,
  onPlatformSelect,
  onModuleSelect,
  onClose
}) {

  switch (currentContext) {
    case AI_MODULES_CONTEXT.PLATFORM_SELECTOR:
      return (
        <PlatformSelector
          onCloseSidebar={onClose}
          onPlatformSelect={(platformId) => {
            onPlatformSelect(platformId);
            onClose();
          }}
        />
      );
    
    case AI_MODULES_CONTEXT.MODULE_GRID:
    case AI_MODULES_CONTEXT.MODULE_DETAIL:
      return (
        <ModuleList
          platform={platform}
          activeModule={module}
          onCloseSidebar={onClose}
          onModuleSelect={(moduleId) => {
            onModuleSelect(platform, moduleId);
            onClose();
          }}
        />
      );
    
    default:
      return null;
  }
}

export default AiModulesSmartNav;
