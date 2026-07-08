import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

type BackendMenuRoute = RouteRecordStringComponent & {
  children?: BackendMenuRoute[];
  type?: string;
};

function filterRouteMenus(menus: BackendMenuRoute[]): BackendMenuRoute[] {
  return menus
    .filter((menu) => menu.type !== 'button')
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterRouteMenus(menu.children) : undefined,
    }));
}

async function getAllMenusApi() {
  const menus =
    await requestClient.get<RouteRecordStringComponent[]>('/system/menu/all');
  return filterRouteMenus(menus);
}

export { filterRouteMenus, getAllMenusApi };
