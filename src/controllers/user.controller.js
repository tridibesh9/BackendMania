import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessandRefreshToken = async (userId)=>{
    try{
        console.log(userId);
        
        const user = await User.findById(userId)
        const accessToken =  await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        return {accessToken,refreshToken}
    }
    catch(error){
        console.log(error);
        
        throw new ApiError(500,"SomethingWent wrong while generating refresh and access Token ")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    const {fullName,email,username,password} = req.body
    console.log(email);


    // Validation 
    if ([fullName,email,username,password].some((field)=>{
        return field?.trim() === ""
    })) {
        throw new ApiError(400, "All fields are required")
    }
    
    console.log(req.files);
    
    const existingUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existingUser){
        throw new ApiError(409, "username or email already exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath =  req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar File is required")
    }
    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = await uploadCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Avatar File is required")
    }
    console.log(avatar.url);
    
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })
    const CreatedUser = await User.findById(user._id).select("-password -refreshToken")
    if(!CreatedUser){
        throw new ApiError(500, "Something went wrong while registering user")
    }
    return res.status(201).json(
        new apiResponse(200, CreatedUser,"User Registered Successfully"))
    
})

const loginUser = asyncHandler(async (req,res)=>{
    const {username,password,email} = req.body
    console.log(username);
    console.log(req.body);
    
    
    if (!username &&  !email) {
        throw new ApiError(400,
            "username or password is required"
        )
    }
    const user = await User.findOne({
        $or: [{username},{email}]

    })
    if( !user){
        throw new ApiError(404,"USer does not exist ");
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password)
    console.log((isPasswordValid));
    
    if( !isPasswordValid){
        throw new ApiError(404,"Invalid user credentials ");
    }
    const {accessToken,refreshToken} = await generateAccessandRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly : true,
        secure: true

    }
    console.log(accessToken);
    console.log(refreshToken);
    console.log(loggedInUser);
    
    
    return res.status(200).
    cookie("accessToken",accessToken,options).
    cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(
            200,{
                user :loggedInUser,accessToken,refreshToken
            },"User Logged In sucssfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken: undefined
        },
    },{
        new: true
    })
    const options = {
        httpOnly : true,
        secure: true

    }
    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new apiResponse(200,{},"Logged Out successfully "))
})

const refreshAccessToken  = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Access")
    }
    try {
        const decodedRefreshToken = await jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = User.findById(decodedRefreshToken._id)
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token  ")
        }
        if ( incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token expired or Used ")
        }
        const {accessToken,newRefreshToken} = generateAccessandRefreshToken(user._id)
        const options = {
            httpOnly: true,
            secure: true
        }
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token ")
    }

})

const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword,newPassword} =req.body
    const user = await User.findById(req.user?._id)
    const isValid = user.isPasswordValid(oldPassword)
    if(!isValid){
        throw new ApiError(401,"Unauthorized Access")
    }
    user.password = newPassword
    user.save({validateBeforeSave: false})
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new apiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body
    if(!fullName || !email){
        throw new ApiError()
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")
    return res
    .status(200)
    .json(new apiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const coverImage = await uploadCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
     const {username} = req.params
     if(!username.trim()){
        throw new ApiError(400,"Username is Miissing")
     }
     const channel = await User.aggregate([{
        $match : {username : username.toLowerCase}
     },{
        $lookup : {
            from : "subscriptions",
            localField : "_id",
            foreignField : "channel",
            as : "subscribers"
        }
     },{
        $lookup : {
            from : "subscriptions",
            localField : "_id",
            foreignField : "channel",
            as : "subscribers"
     }
}])
})

export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateDetails,updateCoverImage,updateUserAvatar}