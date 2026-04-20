import mongoose from 'mongoose';
import { createUserGroupMethods, logger, runAsSystem } from '@librechat/data-schemas';
import type { IGroup, IUser } from '@librechat/data-schemas';

const GROUP_CACHE_MS = 30_000;

type GroupCacheEntry = {
  groupId: string;
  groupName: string;
  cachedAt: number;
};

const groupCacheByUserId = new Map<string, GroupCacheEntry>();

let userGroupMethods: ReturnType<typeof createUserGroupMethods> | null = null;

function getUserGroupMethods() {
  if (!userGroupMethods) {
    userGroupMethods = createUserGroupMethods(mongoose);
  }
  return userGroupMethods;
}

async function loadGroupContext(userId: string): Promise<{ groupId: string; groupName: string }> {
  if (mongoose.connection.readyState !== 1) {
    return { groupId: '', groupName: '' };
  }

  const now = Date.now();
  const cached = groupCacheByUserId.get(userId);
  if (cached && now - cached.cachedAt < GROUP_CACHE_MS) {
    return { groupId: cached.groupId, groupName: cached.groupName };
  }

  try {
    const groups = await runAsSystem(async () => getUserGroupMethods().findGroupsByMemberId(userId));
    const groupId = groups.map((group: IGroup) => String(group._id)).join(',');
    const groupName = groups.map((group: IGroup) => group.name).filter(Boolean).join(',');
    groupCacheByUserId.set(userId, { groupId, groupName, cachedAt: now });
    logger.debug('[MCP][groups] resolved group context for user', {
      userId,
      groupCount: groups.length,
      groupIdLen: groupId.length,
      groupNameLen: groupName.length,
    });
    return { groupId, groupName };
  } catch (error) {
    logger.warn(`[MCP] Failed to resolve group context for user ${userId}`, error);
    return { groupId: '', groupName: '' };
  }
}

export type MCPGroupUser = IUser & {
  groupId?: string;
  groupName?: string;
};

export async function enrichUserForMcpGroups(user?: IUser): Promise<MCPGroupUser | undefined> {
  if (!user?.id) {
    return user;
  }

  const { groupId, groupName } = await loadGroupContext(user.id);
  return { ...user, groupId, groupName };
}
