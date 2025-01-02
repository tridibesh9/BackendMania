import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDb = async ()=>{
    try{
        console.log(process.env.MONGODB_URI);
        
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        
        console.log(`\n MONGODB connected ${connectionInstance.connection.host}`);
        

    }catch(error){
        console.log("MONGODB ERROR",error);
        process.exit(1)
        throw(error)
        
    }

}
export default connectDb