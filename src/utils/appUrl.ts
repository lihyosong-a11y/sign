const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getConfiguredUrl = () => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (!configuredUrl) return undefined;

  try {
    return new URL(configuredUrl);
  } catch {
    return undefined;
  }
};

export const inferBasePathFromCurrentPath = () => {
  const pathname = trimTrailingSlash(window.location.pathname) || "/";
  const routeMatchIndex = pathname.search(/\/(?:admin|event)(?:\/|$)/);

  if (routeMatchIndex > 0) return pathname.slice(0, routeMatchIndex);
  if (pathname !== "/" && pathname !== "/admin" && !pathname.startsWith("/event")) return pathname;
  return "";
};

export const getRouterBasename = () => {
  const configuredUrl = getConfiguredUrl();

  if (configuredUrl) {
    const configuredPath = trimTrailingSlash(configuredUrl.pathname);
    const isSameOrigin = window.location.origin === configuredUrl.origin;
    const isUnderConfiguredPath =
      window.location.pathname === configuredPath || window.location.pathname.startsWith(`${configuredPath}/`);

    if (configuredPath && configuredPath !== "/" && (isSameOrigin || isUnderConfiguredPath)) {
      return configuredPath;
    }
  }

  return inferBasePathFromCurrentPath() || undefined;
};

export const getAppBaseUrl = () => {
  const configuredUrl = getConfiguredUrl();
  if (configuredUrl) return trimTrailingSlash(configuredUrl.toString());

  return trimTrailingSlash(`${window.location.origin}${inferBasePathFromCurrentPath()}`);
};
