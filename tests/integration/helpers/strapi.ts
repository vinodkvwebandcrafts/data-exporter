import path from "node:path";
import { compileStrapi, createStrapi } from "@strapi/strapi";

const APP_DIR = path.join(__dirname, "..", "test-app");

let instance: any = null;
let bootPromise: Promise<any> | null = null;

export async function startStrapi(): Promise<any> {
  if (instance) return instance;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    const appContext = await compileStrapi({ appDir: APP_DIR });
    const strapi: any = createStrapi({
      ...appContext,
      autoReload: false,
      serveAdminPanel: false,
    });
    await strapi.load();
    if (strapi.server && typeof strapi.server.mount === "function") {
      strapi.server.mount();
    }
    instance = strapi;
    return strapi;
  })();

  try {
    return await bootPromise;
  } finally {
    bootPromise = null;
  }
}

export async function stopStrapi(): Promise<void> {
  if (instance) {
    try {
      await instance.destroy();
    } catch {
      // ignore teardown errors
    }
    instance = null;
  }
}

export function getStrapi(): any {
  if (!instance) {
    throw new Error("Strapi has not been started. Call startStrapi() first.");
  }
  return instance;
}
