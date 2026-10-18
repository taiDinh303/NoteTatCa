using NTC.ModelViews.AuthModelView;

namespace NTC.Razor.Middleware
{
    public static class SessionHelper
    {
        public static void SetUserInfo(this ISession session, AuthResponseModelView user)
        {
            //session.SetString("JwtToken", user.Token ?? string.Empty);
            //session.SetString("UserId", user.UserId.ToString());
            //session.SetString("UserName", user.UserName ?? string.Empty);
            //session.SetString("FullName", user.FullName ?? string.Empty);
            //session.SetString("Picture", user.Picture ?? string.Empty);
        }
    }

}
