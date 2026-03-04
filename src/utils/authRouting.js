export function getHomePathForRole(role) {
  switch (role) {
    case "central_admin":
      return "/central-admin";
    case "school_head":
      return "/school-head";
    case "administrative_officer":
    default:
      return "/dashboard";
  }
}

export function getHomePathForUser(user) {
  return getHomePathForRole(user?.role);
}

