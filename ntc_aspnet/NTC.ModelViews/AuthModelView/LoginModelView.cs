namespace NTC.ModelViews.AuthModelView
{
    public class LoginModelView
    {
        public string? Email { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool RememberMe { get; set; } = false;
    }
}
