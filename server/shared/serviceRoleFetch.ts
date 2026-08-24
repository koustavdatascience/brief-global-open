export type ServiceRoleConfiguration = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

export type ServiceFetch = (
  path: string,
  init?: RequestInit
) => Promise<Response>;

export function createServiceRoleFetch(
  configuration: ServiceRoleConfiguration,
  request: typeof fetch = fetch,
  createError: (status: number) => Error
): ServiceFetch {
  return async (path, init = {}) => {
    const response = await request(`${configuration.supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: configuration.serviceRoleKey,
        Authorization: `Bearer ${configuration.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw createError(response.status);
    return response;
  };
}
