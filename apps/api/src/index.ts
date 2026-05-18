import { initDb } from "./db/index.js";
import { createApp } from "./app.js";
import { CONFIG } from "./config.js";

initDb();

const app = createApp();

app.listen(CONFIG.PORT, () => {
  console.log(`AI Fix Runner API listening on port ${CONFIG.PORT}`);
});
