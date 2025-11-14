import express from "express";
import cors from "cors";
import dotenvFlow from "dotenv-flow";
import path from "path";
import orderRouter from "./Routes/orderRouter.js";
import depthRouter from "./Routes/depthRouter.js";
import positionRouter from "./Routes/positionRouter.js";
import balanceRouter from "./Routes/balanceRouter.js";

dotenvFlow.config({
    path : path.resolve(__dirname , "../../../")
})

const app = express();
const PORT = parseInt(process.env.SERVER_PORT!);

app.use(cors({
    "origin" : "*"
}));

app.use(express.json());

app.use("/order", orderRouter);
app.use("/depth", depthRouter);
app.use("/position", positionRouter);
app.use("/balance", balanceRouter);

app.listen(PORT , () => {
    console.log(`running on port : ${PORT}`);
})






