import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemUserApi {
  export interface UpdateUserStatusDto {
    status: 0 | 1;
  }
  export interface SystemUser {
    [key: string]: any;
    id: string;
    /** 用户名 */
    username: string;
    /** 用户昵称 */
    real_name: string;
    /** 电话 */
    phone?: string;
    /** 邮箱 */
    email?: string;
    /** 头像 */
    avatar: string;
    /** 用户角色 */
    roles?: string[];
    /** 状态 */
    status: 0 | 1;
    /** 是否是根用户 */
    root: 0 | 1;
    /** 部门 */
    dept?: string;
    /** 部门名称 */
    dept_name?: string;
    /** 性别 */
    sex?: number;
    /** 年龄 */
    age?: number;
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
async function getUserList(params: Recordable<any>) {
  return requestClient.get<Array<SystemUserApi.SystemUser>>('/system/user/list', { params });
}

/**
 * 创建角色
 * @param data 角色数据
 */
async function createUser(data: Omit<SystemUserApi.SystemUser, 'id'>) {
  return requestClient.post('/system/user', data);
}

/**
 * 更新角色
 *
 * @param id 角色 ID
 * @param data 角色数据
 */
async function updateUser(id: string, data: Omit<SystemUserApi.SystemUser, 'id'>) {
  return requestClient.put(`/system/user/${id}`, data);
}
/**
 * 更新角色状态
 *
 * @param id 角色 ID
 * @param data 角色状态数据
 */
async function updateUserStatus(id: string, data: SystemUserApi.UpdateUserStatusDto) {
  return requestClient.put(`/system/user/status/${id}`, data);
}

/**
 * 删除角色
 * @param id 角色 ID
 */
async function deleteUser(id: string) {
  return requestClient.delete(`/system/user/${id}`);
}

export { createUser, deleteUser, getUserList, updateUser, updateUserStatus };
