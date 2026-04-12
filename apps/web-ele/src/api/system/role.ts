import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemRoleApi {
  export interface SystemRole {
    [key: string]: any;
    id: string;
    /** 角色名称 */
    name: string;
    /** 状态 */
    status: 0 | 1;
    /** 父角色 ID */
    pid?: string;
    /** 角色路径 */
    path?: string;
    /** 角色等级 */
    level?: number;
    /** 角色描述 */
    description?: string;
    /** 权限列表 */
    permissions: string[];
    /** 备注 */
    remark?: string;
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
  }
}

/**
 * 获取角色列表数据
 */
async function getRoleList(params: Recordable<any>) {
  return requestClient.get<Array<SystemRoleApi.SystemRole>>('/system/role/list', { params });
}

/**
 * 创建角色
 * @param data 角色数据
 */
async function createRole(data: Omit<SystemRoleApi.SystemRole, 'id'>) {
  return requestClient.post('/system/role', data);
}

/**
 * 更新角色
 *
 * @param id 角色 ID
 * @param data 角色数据
 */
async function updateRole(id: string, data: Omit<SystemRoleApi.SystemRole, 'id'>) {
  return requestClient.put(`/system/role/${id}`, data);
}

/**
 * 删除角色
 * @param id 角色 ID
 */
async function deleteRole(id: string) {
  return requestClient.delete(`/system/role/${id}`);
}

export { createRole, deleteRole, getRoleList, updateRole };
