export async function dashboard(req, res){
    res.json({
    message: "Welcome to Dashboard",
    user: req.user  //authenticated user
});
}