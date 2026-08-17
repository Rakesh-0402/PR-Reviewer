import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
    name: {
        type : String,
        required : true,
    },
    email : {
        type : String,
        required : true,
        unique : true,
    },
    password : {
        type : String,
        required:true,
    },
    // Total number of successfully completed AI PR reviews
    totalReviews: {
      type: Number,
      default: 0,
    },

    //password reset fields
    resetPasswordToken: {
        type: String,
        default: null,
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
    },

},
    {
    timestamps: true
  });

//create the Model
const User = mongoose.model("User" , userSchema);

export default User;