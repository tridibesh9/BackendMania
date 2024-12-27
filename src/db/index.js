import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDb = async ()=>{
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        // App.on("error",(error)=>{
        //     console.log(error);
        //     throw(error)
        // })
        console.log(`\n MONGODB connected ${connectionInstance.connection.host}`);
        

    }catch(error){
        console.log("MONGODB ERROR",error);
        process.exit(1)
        throw(error)
        
    }

}
export default connectDb