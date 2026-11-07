using NTC.Contract.Services.Interface;
using NTC.Core.Security;
namespace NTC.API.Middleware;
public sealed class NoteVaultMiddleware(RequestDelegate next) {
 public async Task InvokeAsync(HttpContext context, INoteVaultService vault, ICurrentUser user) {
  if (user.IsAuthenticated && !user.IsInRole("Admin") && context.Request.Headers.TryGetValue("X-Note-Vault", out var token)) {
   if (token.Count != 1 || !await vault.AuthorizeAsync(token.ToString())) {
    context.Response.StatusCode=403;
    await context.Response.WriteAsJsonAsync(new { statusCode=403,code="VAULT_LOCKED",message="Unlock hidden notes again.",data=(object?)null,traceId=context.TraceIdentifier }); return;
   }
  }
  await next(context);
 }
}
