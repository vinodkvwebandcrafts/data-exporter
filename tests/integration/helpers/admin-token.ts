import { startStrapi } from "./strapi";

const TEST_ADMIN_EMAIL = "test@test.io";
const TEST_ADMIN_PASSWORD = "Test1234!";

/**
 * Returns an admin access token for a super-admin user, creating the user on
 * first call. Subsequent calls reuse the same user.
 *
 * Strapi 5 (>=5.x sessions) replaced the old `admin.services.token.createJwtToken`
 * helper with `strapi.sessionManager(origin)`. The flow is:
 *   1. generateRefreshToken(userId, deviceId) -> { token: refreshToken }
 *   2. generateAccessToken(refreshToken) -> { token: accessToken }
 * The access token is what the `admin::isAuthenticatedAdmin` policy validates
 * via the bearer token strategy.
 */
export async function getSuperAdminJwt(): Promise<string> {
  const strapi: any = await startStrapi();

  const superAdminRole = await strapi.db.query("admin::role").findOne({
    where: { code: "strapi-super-admin" },
  });

  if (!superAdminRole) {
    throw new Error(
      "Could not find strapi-super-admin role. Has Strapi finished bootstrapping?"
    );
  }

  let user = await strapi.db.query("admin::user").findOne({
    where: { email: TEST_ADMIN_EMAIL },
    populate: ["roles"],
  });

  if (!user) {
    user = await strapi.admin.services.user.create({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
      firstname: "Test",
      lastname: "User",
      isActive: true,
      roles: [superAdminRole.id],
    });
  }

  const sessionManager = strapi.sessionManager;
  if (!sessionManager) {
    throw new Error(
      "strapi.sessionManager is not available. Strapi >= 5.x is required."
    );
  }

  const userId = String(user.id);
  const deviceId = `test-device-${userId}`;

  const { token: refreshToken } = await sessionManager("admin").generateRefreshToken(
    userId,
    deviceId,
    { type: "refresh" }
  );

  const accessResult = await sessionManager("admin").generateAccessToken(refreshToken);
  if ("error" in accessResult) {
    throw new Error(`Failed to mint admin access token: ${accessResult.error}`);
  }

  return accessResult.token;
}
