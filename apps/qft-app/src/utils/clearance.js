// clearance.js - QFT Ecosystem Security Clearance System

// Database clearance levels (stored in roles table)
export const CLEARANCE_LEVELS = {
  ALPHA_OWNER: 'α',           // α - Highest level (Owner)
  OMEGA_EXECUTIVE: 'Ω',       // Ω - Executive
  LEVEL_3_MANAGEMENT: '3',    // 3 - Management
  LEVEL_2_SECURITY: '2',      // 2 - Security
  LEVEL_1_IT: '1',            // 1 - IT
  LEVEL_0_BASE: '0'           // 0 - Base/Standard Staff
};

// Role names for Level 0 distinction
export const ROLE_NAMES = {
  STAFF: 'Staff',
  CLIENT: 'Client',
  AFFILIATE: 'Affiliate'
};

export const ACCOUNT_TYPES = {
  AFFILIATE: 'affiliate',  // Level 0 - Can post ads, subscription-based
  CLIENT: 'client',        // Level 0 - Point of sale, contract management
  STAFF: 'staff'           // Level 0 - Non-privileged staff, assigned tasks only
};

// Privileged staff levels (can access Control Panel and manage others)
export const PRIVILEGED_LEVELS = [
  CLEARANCE_LEVELS.ALPHA_OWNER,
  CLEARANCE_LEVELS.OMEGA_EXECUTIVE,
  CLEARANCE_LEVELS.LEVEL_3_MANAGEMENT,
  CLEARANCE_LEVELS.LEVEL_2_SECURITY,
  CLEARANCE_LEVELS.LEVEL_1_IT
];

// Staff role names (includes all hired positions)
export const STAFF_ROLES = [
  'Owner', 'Admin',        // Alpha level
  'Executive',             // Omega level
  'Management',            // Level 3
  'Security',              // Level 2
  'IT Staff',              // Level 1
  'Staff'                  // Level 0 staff (NOT Client or Affiliate)
];

// Helper functions for clearance checks
export const isPrivilegedStaff = (clearanceLevel) => {
  return PRIVILEGED_LEVELS.includes(clearanceLevel);
};

// Check if user is QFT staff (hired employee, not client/affiliate)
export const isStaffMember = (roleName, allRoles = []) => {
  // If no roles, user is a client (default)
  if (!roleName && (!allRoles || allRoles.length === 0)) {
    return false;
  }
  
  // Check primary role name
  if (roleName && STAFF_ROLES.includes(roleName)) {
    return true;
  }
  
  // Check all roles for any staff role
  if (allRoles && allRoles.length > 0) {
    return allRoles.some(role => STAFF_ROLES.includes(role));
  }
  
  return false;
};

export const hasMinimumClearance = (userLevel, requiredLevel) => {
  const hierarchy = [
    CLEARANCE_LEVELS.ALPHA_OWNER,
    CLEARANCE_LEVELS.OMEGA_EXECUTIVE,
    CLEARANCE_LEVELS.LEVEL_3_MANAGEMENT,
    CLEARANCE_LEVELS.LEVEL_2_SECURITY,
    CLEARANCE_LEVELS.LEVEL_1_IT,
    CLEARANCE_LEVELS.LEVEL_0_BASE
  ];
  
  const userIndex = hierarchy.indexOf(userLevel);
  const requiredIndex = hierarchy.indexOf(requiredLevel);
  
  return userIndex !== -1 && requiredIndex !== -1 && userIndex <= requiredIndex;
};

export const isAffiliate = (roleName) => roleName === ROLE_NAMES.AFFILIATE;
export const isClient = (roleName) => !roleName || roleName === ROLE_NAMES.CLIENT;

export const getClearanceLabel = (clearanceLevel) => {
  const labels = {
    [CLEARANCE_LEVELS.ALPHA_OWNER]: 'α Owner',
    [CLEARANCE_LEVELS.OMEGA_EXECUTIVE]: 'Ω Executive',
    [CLEARANCE_LEVELS.LEVEL_3_MANAGEMENT]: 'Level 3 Management',
    [CLEARANCE_LEVELS.LEVEL_2_SECURITY]: 'Level 2 Security',
    [CLEARANCE_LEVELS.LEVEL_1_IT]: 'Level 1 IT',
    [CLEARANCE_LEVELS.LEVEL_0_BASE]: 'Level 0 Base'
  };
  return labels[clearanceLevel] || 'Client';
};

export const getRoleLabel = (roleName) => {
  if (!roleName) return 'Client';
  return roleName;
};
