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

const SYSTEM_ROLE_MAP = {
    'Owner': CHAT_ROLES.OWNER,
    'Admin': CHAT_ROLES.ADMIN,
    'staff': CHAT_ROLES.MODERATOR,
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

function getHighestChatRole(systemRoles) {
    if (!systemRoles || !Array.isArray(systemRoles)) {
        return CHAT_ROLES.GUEST;
    }

    for (const role of CHAT_ROLE_HIERARCHY) {
        if (systemRoles.some(systemRole => SYSTEM_ROLE_MAP[systemRole] === role)) {
            return role;
        }
    }

    return CHAT_ROLES.GUEST;
}

export const checkPermission = (user, action) => {
  if (!user) return false;

  const userHighestRole = getHighestChatRole(user.all_roles);

  const permissions = ROLE_PERMISSIONS[userHighestRole] || [];
  return permissions.includes(action);
};