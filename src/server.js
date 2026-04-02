require("dotenv").config();

const app = require("./app");
const { startAutoCancelJob } = require("./jobs/autoCancel.job");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  startAutoCancelJob();
});