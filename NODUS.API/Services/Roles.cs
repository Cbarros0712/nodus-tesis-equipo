public static class Roles
{
    public const string PersonalAsistencial = "Personal asistencial";
    public const string Tecnico = "Técnico";
    public const string Bioingeniero = "Bioingeniero";

    public static readonly string[] Todos =
    {
            PersonalAsistencial, Tecnico, Bioingeniero
        };

    public const string Administrador = Bioingeniero;
    public const string JefePatrimonio = Bioingeniero;
    public const string JefeServicio = Bioingeniero;
    public const string AuditorAnmat = Bioingeniero;
    public const string TecnicoBiomedico = Tecnico;
    public const string Medico = PersonalAsistencial;
    public const string Residente = PersonalAsistencial;
    public const string Enfermero = PersonalAsistencial;

    public const string GestionReportesFalla = Bioingeniero;
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

