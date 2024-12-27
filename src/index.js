import mongoose from "mongoose";
import "dotenv/config"
import { app } from "./app.js";
import connectDb from "./db/index.js";


connectDb()
.then(()=>{
    app.listen(process.env.PORT|| 8000,()=>{
        console.log(`App listening to ${process.env.PORT}`);
        
    })
})
.catch()