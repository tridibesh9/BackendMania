import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";


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


export {registerUser,loginUser,logoutUser}