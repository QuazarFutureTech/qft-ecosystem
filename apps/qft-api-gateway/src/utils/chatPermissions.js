
export const CHAT_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  GUEST: 'guest'
};

export const CHAT_ACTIONS = {
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

// This maps the roles from your database (or other system) to the chat roles.
// The keys are the roles from `socket.user.roles`
const SYSTEM_ROLE_MAP = {
    'Owner': CHAT_ROLES.OWNER,
    'Admin': CHAT_ROLES.ADMIN,
    'staff': CHAT_ROLES.MODERATOR, // from `deleteMessage` code
    'Staff': CHAT_ROLES.MODERATOR,
    'moderator': CHAT_ROLES.MODERATOR,
    'member': CHAT_ROLES.MEMBER,
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
    if (!systemRoles || !Array.isArray(systemRoles)) {
        return CHAT_ROLES.GUEST;
    }

    for (const role of CHAT_ROLE_HIERARCHY) {
        // Check if any of the user's system roles map to this chat role level
        if (systemRoles.some(systemRole => SYSTEM_ROLE_MAP[systemRole] === role)) {
            return role; // Return the first one found, which is the highest
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
export function checkPermission(user, action) {
  if (!user) return false;

  const userHighestRole = getHighestChatRole(user.roles);

  const permissions = ROLE_PERMISSIONS[userHighestRole] || [];
  return permissions.includes(action);
}

