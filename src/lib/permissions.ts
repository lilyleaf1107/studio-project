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

export function canManageUsers(role?: UserRole) {
  return role === 'admin'
}

/** 老板和管理员都能进入账号管理页面 */
export function canViewUsers(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}

/** 老板只能改员工的身份卡；管理员全部可改 */
export function canEditJobTitle(actorRole?: UserRole, targetRole?: UserRole) {
  if (actorRole === 'admin') return true
  if (actorRole === 'owner') return targetRole === 'staff'
  return false
}

export function canManageSystem(role?: UserRole) {
  return role === 'admin'
}

export function canAdjustPriority(role?: UserRole) {
  return role === 'admin' || role === 'owner'
}
