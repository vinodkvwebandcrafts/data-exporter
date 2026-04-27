import { startStrapi } from "./strapi";

const TEST_ADMIN_EMAIL = "test@test.io";
const TEST_ADMIN_PASSWORD = "Test1234!";

/**
 * Returns a JWT for a super-admin user, creating the user on first call.
 * Subsequent calls reuse the same user.
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

  return strapi.admin.services.token.createJwtToken(user);
}
