using System.Net;
using Microsoft.AspNetCore.Identity;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.Feedback;
using NTC.Services.Shared;
namespace NTC.Services.Service;
public sealed class FeedbackService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock,
    IEmailSender email, UserManager<ApplicationUser> users) : BaseService(work, actor, clock), IFeedbackService
{
    public async Task SendAsync(FeedbackRequest request)
    {
        var id = UserId;
        if (request.Kind is not ("Report a problem" or "Suggest an improvement" or "Ask a question")
            || string.IsNullOrWhiteSpace(request.Message) || request.Message.Length > 5000)
            throw DomainErrors.Invalid("Invalid feedback. Choose a type and enter up to 5000 characters.");
        var user = await users.FindByIdAsync(id.ToString()) ?? throw DomainErrors.Unauthorized();
        var body = $"<h2>NoteTatCa feedback</h2><p>Type: {WebUtility.HtmlEncode(request.Kind)}</p>"
            + $"<p>Account: {WebUtility.HtmlEncode(user.Email)}<br>User: {id}<br>Time (UTC): {UtcNow:O}</p>"
            + $"<pre style=\"white-space:pre-wrap\">{WebUtility.HtmlEncode(request.Message.Trim())}</pre>";
        await email.SendEmailAsync("lmht016847@gmail.com", $"NoteTatCa feedback: {request.Kind}", body);
    }
}
