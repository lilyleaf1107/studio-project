import type { UserRole } from '@/types'

export function canViewAllProjects(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}

export function canViewAllRecords(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}

export function canCreateProject(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}

export function canCreateTask(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}

export function canReviewTask(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}

/** 经理可以管理所有用户 */
export function canManageUsers(role?: UserRole) {
  return role === 'admin'
}

/** 老板和经理都能进入账号管理页面 */
export function canViewUsers(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}

/**
 * 经理可以改所有人的身份卡
 * 老板可以改伙伴和员工的身份卡（不能改经理）
 * 老板/经理/伙伴可以改自己的身份卡
 */
export function canEditJobTitle(actorRole?: UserRole, targetRole?: UserRole, isSelf?: boolean) {
  if (actorRole === 'admin') return true
  if (isSelf && (actorRole === 'owner' || actorRole === 'partner')) return true
  if (actorRole === 'owner' && (targetRole === 'staff' || targetRole === 'partner')) return true
  return false
}

/** 经理管理系统设置；老板可管理系统设置但不能管经理；伙伴/员工只能看外观 */
export function canManageSystem(role?: UserRole) {
  return role === 'admin'
}

/** 老板可以管理任务模板和系统设置（但不能越过经理） */
export function canManageTemplates(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}

/** 伙伴和员工只能看外观 */
export function canOnlyViewAppearance(role?: UserRole) {
  return role === 'staff' || role === 'partner'
}

export function canAdjustPriority(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}
