// apps/api-gateway/src/utils/chatPermissions.js

const CHAT_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  GUEST: 'guest'
};

const CHAT_ACTIONS = {
  SEND_MESSAGE: 'send_message',
  EDIT_OWN_MESSAGE: 'edit_own_message',
  EDIT_ANY_MESSAGE: 'edit_any_message',
  DELETE_OWN_MESSAGE: 'delete_own_message',
  DELETE_ANY_MESSAGE: 'delete_any_message',
  PIN_MESSAGE: 'pin_message'
};

const ROLE_PERMISSIONS = {
  [CHAT_ROLES.OWNER]: [
    CHAT_ACTIONS.SEND_MESSAGE,
    CHAT_ACTIONS.EDIT_OWN_MESSAGE,
    CHAT_ACTIONS.EDIT_ANY_MESSAGE,
    CHAT_ACTIONS.DELETE_OWN_MESSAGE,
    CHAT_ACTIONS.DELETE_ANY_MESSAGE,
    CHAT_ACTIONS.PIN_MESSAGE
  ],
  [CHAT_ROLES.ADMIN]: [
    CHAT_ACTIONS.SEND_MESSAGE,
    CHAT_ACTIONS.EDIT_OWN_MESSAGE,
    CHAT_ACTIONS.EDIT_ANY_MESSAGE,
    CHAT_ACTIONS.DELETE_OWN_MESSAGE,
    CHAT_ACTIONS.DELETE_ANY_MESSAGE,
    CHAT_ACTIONS.PIN_MESSAGE
  ],
  [CHAT_ROLES.MODERATOR]: [
    CHAT_ACTIONS.SEND_MESSAGE,
    CHAT_ACTIONS.EDIT_OWN_MESSAGE,
    CHAT_ACTIONS.DELETE_OWN_MESSAGE,
    CHAT_ACTIONS.DELETE_ANY_MESSAGE
  ],
  [CHAT_ROLES.MEMBER]: [
    CHAT_ACTIONS.SEND_MESSAGE,
    CHAT_ACTIONS.EDIT_OWN_MESSAGE,
    CHAT_ACTIONS.DELETE_OWN_MESSAGE
  ],
  [CHAT_ROLES.GUEST]: [
    CHAT_ACTIONS.SEND_MESSAGE
  ]
};

// Map system roles to chat roles
const SYSTEM_ROLE_MAP = {
    'alpha_owner': CHAT_ROLES.OWNER,  // Matches your God Mode role
    'owner': CHAT_ROLES.OWNER,
    'admin': CHAT_ROLES.ADMIN,
    'staff': CHAT_ROLES.MODERATOR,
    'moderator': CHAT_ROLES.MODERATOR,
    'member': CHAT_ROLES.MEMBER,
    'level_0_standard': CHAT_ROLES.MEMBER
};

const CHAT_ROLE_HIERARCHY = [
    CHAT_ROLES.OWNER,
    CHAT_ROLES.ADMIN,
    CHAT_ROLES.MODERATOR,
    CHAT_ROLES.MEMBER,
    CHAT_ROLES.GUEST,
];

/**
 * Gets the highest chat role for a user based on their system roles.
 * @param {string[]} systemRoles - Array of roles from the database/user object.
 * @returns {string} The highest CHAT_ROLES value.
 */
function getHighestChatRole(systemRoles) {
    if (!systemRoles) return CHAT_ROLES.GUEST;
    
    // Convert single string role to array if needed (handles your qft_role string)
    const rolesToCheck = Array.isArray(systemRoles) ? systemRoles : [systemRoles];

    for (const role of CHAT_ROLE_HIERARCHY) {
        if (rolesToCheck.some(systemRole => SYSTEM_ROLE_MAP[systemRole] === role)) {
            return role;
        }
    }

    return CHAT_ROLES.GUEST;
}

/**
 * Checks if a user has permission to perform an action.
 * @param {object} user - The user object from the socket.
 * @param {string} action - The CHAT_ACTIONS key.
 * @returns {boolean} - True if permitted, false otherwise.
 */
function checkPermission(user, action) {
  if (!user) return false;

  // Handles both array of roles (from JWT) or single qft_role (from DB)
  const roles = user.roles || user.qft_role;
  const userHighestRole = getHighestChatRole(roles);

  const permissions = ROLE_PERMISSIONS[userHighestRole] || [];
  return permissions.includes(action);
}

// ✅ THE FIX: Use module.exports instead of export const
module.exports = {
    CHAT_ROLES,
    CHAT_ACTIONS,
    checkPermission
};