import mongoose from "mongoose";
import mongooseAggregratePaginate from "mongoose-aggregate-paginate-v2"
const videoSchema = new  mongoose.Schema({
    videoFile : {
        type : String,
        required : true
    },
    thumbnail : {
        type : String,
        required : true
    },
    title : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    duration : {
        type : Number,
        required : true
    },
    views : {
        type : Number,
        required : true,
        default : 0
    },
    isPublished : {
        type : Boolean,
        required : true,
        default : true
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }
},{timestamps : true})

videoSchema.plugin(mongooseAggregratePaginate)
export const Video = mongoose.model("Video",videoSchema)