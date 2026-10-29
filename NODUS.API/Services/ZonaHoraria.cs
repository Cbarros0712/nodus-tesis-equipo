namespace NODUS.API.Services
{
    public static class ZonaHoraria
    {
        public static readonly TimeZoneInfo Argentina = Obtener();

        public static DateTime AhoraArgentina() => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Argentina);

        private static TimeZoneInfo Obtener()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires"); }
            catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("Argentina Standard Time"); }
        }
    }
}
