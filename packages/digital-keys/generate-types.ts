import { generateTypes } from "../../utils/generate-types";
import path from "path";
import { DigitalProductsPlugin } from "./src";

require("dotenv").config({ path: path.join(__dirname, "../dev-server/.env") });

generateTypes(
  {
    plugins: [
      DigitalProductsPlugin.init({
        enabled: true,
      }),
    ],
  },
  {
    pluginDir: __dirname,
    e2e: true,
    ui: false,
  },
).then(() => process.exit(0));
