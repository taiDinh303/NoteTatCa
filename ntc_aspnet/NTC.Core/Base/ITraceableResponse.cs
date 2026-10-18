namespace NTC.Core.Base;

public interface ITraceableResponse
{
    string? TraceId { get; set; }
}
