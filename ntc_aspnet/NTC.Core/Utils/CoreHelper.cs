namespace NTC.Core.Utils
{
    public class CoreHelper
    {
        public static DateTimeOffset SystemTimeNow => DateTimeOffset.UtcNow;

        public static DateTimeOffset SystemTimeUTCNow => TimeHelper.ConvertToUtcPlus7NotChanges(DateTimeOffset.Now);
    }
}
