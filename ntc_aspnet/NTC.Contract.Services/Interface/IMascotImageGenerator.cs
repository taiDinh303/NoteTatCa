namespace NTC.Contract.Services.Interface;
public sealed record MascotImages(byte[] Directions, byte[] Reactions);
public interface IMascotImageGenerator
{
    Task<MascotImages> GenerateAsync(Guid userId, string description, byte[]? referencePng, CancellationToken token);
}
