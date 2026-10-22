using System.Text.Encodings.Web;

namespace NTC.Services.Infrastructure;

public sealed class EmailTemplateRenderer
{
    private static string Safe(string? value) => HtmlEncoder.Default.Encode(value ?? string.Empty);
    public string RenderVerificationCode(string code) =>
        $$"""
        <!doctype html>
        <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background-color:#f5f3ff;color:#27243b;font-family:Arial,Helvetica,sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">One little step to make room for your ideas. Your code is valid for 10 minutes.</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f3ff;">
            <tr><td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e9e5f5;border-radius:20px;">
                <tr><td style="padding:32px 28px 12px;color:#6d4aff;font-size:18px;font-weight:bold;">NoteTatCa <span aria-hidden="true">✦</span></td></tr>
                <tr><td style="padding:0 28px 28px;">
                  <h1 style="margin:12px 0 16px;font-size:28px;line-height:1.25;">A little space for your big ideas.</h1>
                  <p style="margin:0 0 12px;font-size:16px;line-height:1.7;">Hello there,</p>
                  <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">A passing thought, a plan for tomorrow, a moment worth keeping — we're happy to help you hold on to it. Let's start by verifying your email.</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;">
                    <tr><td align="center" style="padding:20px 8px 8px;font-size:12px;font-weight:bold;color:#63577d;">YOUR CONFIRMATION CODE</td></tr>
                    <tr><td align="center" style="padding:0 8px 20px;font-family:Consolas,monospace;font-size:32px;font-weight:bold;letter-spacing:6px;color:#4c1d95;">{{Safe(code)}}</td></tr>
                  </table>
                  <p style="margin:18px 0 24px;font-size:14px;line-height:1.7;color:#63577d;">Enter this code in NoteTatCa within <strong>10 minutes</strong>. Keep it to yourself — never share your code with anyone.</p>
                  <p style="margin:0;font-size:16px;line-height:1.7;">Here's to the ideas you'll keep.<br><strong>The NoteTatCa team</strong></p>
                </td></tr>
                <tr><td style="padding:20px 28px;border-top:1px solid #ede9f5;font-size:12px;line-height:1.7;color:#70677e;">Didn't request this code? You can safely ignore this email.</td></tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#70677e;">NoteTatCa · A home for your thoughts.</p>
            </td></tr>
          </table>
        </body></html>
        """;
    public string RenderChangeEmail(string username, string link, string newEmail) =>
        $"<p>Hello {Safe(username)},</p><p>You requested to change your email to <strong>{Safe(newEmail)}</strong>.</p><p><a href='{Safe(link)}'>Confirm new email</a></p>";
    public string RenderSetPasswordLink(string username, string link) =>
        $"<p>Hello {Safe(username)},</p><p>Use this link to set a password for your NoteTatCa account.</p><p><a href='{Safe(link)}'>Set password</a></p>";
    public string RenderForgotPassword(string username, string link) =>
        $"<p>Hello {Safe(username)},</p><p>We received a request to reset your password.</p><p><a href='{Safe(link)}'>Reset password</a></p><p>If you did not request this, ignore this email.</p>";
}
