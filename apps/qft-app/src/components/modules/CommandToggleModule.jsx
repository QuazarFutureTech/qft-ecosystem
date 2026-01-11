import React, { useState } from 'react';
import Switch from '../elements/Switch';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { fetchGuildConfig, saveGuildConfig } from '../../services/admin';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

const defaultCategories = ['moderation','utility','tickets','admin','custom','automod'];

// This file has been removed as the Command Toggle module is deprecated and no longer needed.
