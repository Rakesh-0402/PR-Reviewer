import {z} from "zod";

export const signupSchema = z.object({
        name : z.string().min(1, "name is required"),

        email : z.string().email("Invalid email"),

        password : z.string().min(8, "Password must be of atleast 8 characters"),
        confirmPassword : z.string()
    })
    .refine((data) => data.password === data.confirmPassword,{
        message : "Passwords do not match" ,
        path :["confirmPassword"]
    });