namespace NODUS.API.Services
{
    public static class Roles
    {
        public const string Administrador = "Administrador";
        public const string JefePatrimonio = "Jefe patrimonio";
        public const string TecnicoBiomedico = "Técnico biomédico";
        public const string Medico = "Médico";
        public const string Residente = "Residente";
        public const string Enfermero = "Enfermero";
        public const string JefeServicio = "Jefe servicio";
        public const string AuditorAnmat = "Auditor ANMAT";

        public const string PersonalAsistencial = "Personal asistencial";

        public static readonly string[] Todos =
        {
            Administrador, JefePatrimonio, TecnicoBiomedico, Medico, Residente,
            Enfermero, JefeServicio, AuditorAnmat, PersonalAsistencial
        };

        public const string GestionReportesFalla = Administrador + "," + JefePatrimonio + "," + JefeServicio;
    }

    public static class Politicas
    {
        public const string UsuarioInterno = "UsuarioInterno";
        public const string CualquierUsuario = "CualquierUsuario";
    }

    public static class LimitesTasa
    {
        public const string ReportesFalla = "ReportesFalla";
    }
}
