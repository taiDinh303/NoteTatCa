using System.Buffers.Binary;
using NTC.Core.Base;

namespace NTC.Services.Shared;

public static class ProfilePicture
{
    public const int MaxLength = 100000;
    public static void Validate(string? value)
    {
        if (string.IsNullOrEmpty(value)) return;
        if (value.Length <= 2048 && Uri.TryCreate(value, UriKind.Absolute, out var url) && url.Scheme == "https") return;
        const string prefix = "data:image/png;base64,";
        if (value.Length <= MaxLength && value.StartsWith(prefix, StringComparison.Ordinal))
        {
            try
            {
                var bytes = Convert.FromBase64String(value[prefix.Length..]);
                ReadOnlySpan<byte> signature = [137, 80, 78, 71, 13, 10, 26, 10];
                if (bytes.Length >= 57 && bytes.AsSpan(0, 8).SequenceEqual(signature)
                    && BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(8, 4)) == 13
                    && bytes.AsSpan(12, 4).SequenceEqual("IHDR"u8)
                    && BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(16, 4)) is > 0 and <= 128
                    && BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(20, 4)) is > 0 and <= 128
                    && bytes.AsSpan(bytes.Length - 8, 4).SequenceEqual("IEND"u8)) return;
            }
            catch (FormatException) { }
        }
        throw DomainErrors.Invalid("Choose a PNG avatar up to 128 × 128 pixels, or an HTTPS picture URL.");
    }
}
