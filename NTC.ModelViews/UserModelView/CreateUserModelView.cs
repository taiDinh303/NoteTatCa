using NTC.ModelViews.UserInfoModelView;

namespace NTC.ModelViews.UserModelView
{
    public class CreateUserModelView
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public CreateUserInfoModelView? CreateUserInfoModelView { get; set; }
    }
}
