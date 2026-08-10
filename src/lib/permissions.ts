import type { UserRole } from '@/types'

export function canViewAllProjects(role?: UserRole) {
  return role === 'owner' || role === 'admin'
}

export function canViewAllRecords(role?: UserRole) {
  return role === 'owner' || role === 'admin'
}

export function canCreateProject(role?: UserRole) {
  return role === 'owner' || role === 'admin'
}

export function canCreateTask(role?: UserRole) {
  return role === 'owner' || role === 'admin'
}

export function canReviewTask(role?: UserRole) {
  return role === 'owner' || role === 'admin'
}

export function canManageUsers(role?: UserRole) {
  return role === 'admin'
}

export function canManageSystem(role?: UserRole) {
  return role === 'admin'
}
