/** 하위 상세 경로는 부모 메뉴에 속하며 접두어가 같은 다른 메뉴는 제외한다. */
export function isNavigationSelected(pathname: string, path: string) {
  return pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
}
