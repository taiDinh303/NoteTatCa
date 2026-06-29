namespace NTC.Core.Utils
{
    public class CoreHelper
    {
        public static DateTimeOffset SystemTimeNow => TimeHelper.ConvertToUtcPlus7(DateTimeOffset.Now);

        public static DateTimeOffset SystemTimeUTCNow => TimeHelper.ConvertToUtcPlus7NotChanges(DateTimeOffset.Now);
    }
}
