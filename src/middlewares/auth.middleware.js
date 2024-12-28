import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
export const verifyJWT = asyncHandler(async(req,_,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace('Bearer ',"")//cookies
        console.log(token);
        
        if (!token){
            throw new ApiError(
                401,"Unauthorised Access"
            )
        }
        const decodeToken = await jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodeToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(401,"Invalid AccessToken ")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401,error ||"Invalid Access Token")
        
    }
})