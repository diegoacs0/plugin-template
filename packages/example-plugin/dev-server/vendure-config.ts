import { DefaultSearchPlugin, VendureConfig } from "@vendure/core";
import { DashboardPlugin } from "@vendure/dashboard/plugin";
import "dotenv/config";
import path from "path";
import { ExamplePlugin } from "../src";

const apiPort = process.env.API_PORT || 3000;

export const config: VendureConfig = {
  apiOptions: {
    port: +apiPort,
    adminApiPath: "admin-api",
    shopApiPath: "shop-api",
    shopApiPlayground: true,
    adminApiPlayground: true,
  },
  authOptions: {
    tokenMethod: ["bearer", "cookie"],
    superadminCredentials: {
      identifier: "superadmin",
      password: "superadmin",
    },
  },
  dbConnectionOptions: {
    type: "sqljs",
    synchronize: true,
    migrations: [path.join(__dirname, "../migrations/*.+(js|ts)")],
    logging: false,
    autoSave: true,
    location: path.join(__dirname, "vendure.sqlite"),
  },
  paymentOptions: {
    paymentMethodHandlers: [],
  },
  plugins: [
    DefaultSearchPlugin.init({}),
    ExamplePlugin.init({
      enabled: true,
    }),
    DashboardPlugin.init({
      route: "dashboard",
      appDir: path.join(__dirname, "./dist/dashboard"),
    }),
  ],
};
