import jwt from "jsonwebtoken";

export default function auth(req, res, next){
    const authHeader = req.headers.authorization;

    //check if the header exists
    if(!authHeader) {
        return res.status(401).json({
            message : "Unauthorized"
        });
    }
    //extract the token if exist
    const token = authHeader.split(" ")[1];

    try{
        const decoded = jwt.verify(token , process.env.JWT_SECRET); //verify the token
        req.user = decoded;  //id

        next();  //pass the control to next route/controller
    } 
    catch(error){
        return res.status(401).json({
            message : "Invalid or expired token"
        });
    }


}