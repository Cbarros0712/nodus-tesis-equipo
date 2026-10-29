using Microsoft.EntityFrameworkCore;
using NODUS.Models;

namespace NODUS.Data
{
    public class NodusDbContext : DbContext
    {
        public DbSet<Marca> Marcas { get; set; }
        public DbSet<TipoActivo> TiposActivo { get; set; }
        public DbSet<EstadoEquipo> EstadosEquipo { get; set; }
        public DbSet<Servicio> Servicios { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Insumo> Insumos { get; set; }
        public DbSet<Equipo> Equipos { get; set; }
        public DbSet<OrdenTrabajo> OrdenesTrabajo { get; set; }
        public DbSet<Intervencion> Intervenciones { get; set; }
        public DbSet<Ubicacion> Ubicaciones { get; set; }
        public DbSet<BajaPatrimonial> BajasPatrimoniales { get; set; }
        public DbSet<UsoInsumo> UsosInsumo { get; set; }
        public DbSet<HojaDeVida> HojasDeVida { get; set; }
        public DbSet<Alerta> Alertas { get; set; }
        public DbSet<Sector> Sectores { get; set; }
        public DbSet<EquipoComponente> EquipoComponentes { get; set; }
        public DbSet<HospitalExterno> HospitalesExternos { get; set; }
        public DbSet<Prestamo> Prestamos { get; set; }
        public DbSet<PrestamoComponente> PrestamoComponentes { get; set; }
        public DbSet<RemitoContador> RemitoContadores { get; set; }
        public DbSet<ProrrogaPrestamo> ProrrogasPrestamo { get; set; }
        public DbSet<ReporteFalla> ReportesFalla { get; set; }

        public NodusDbContext(DbContextOptions<NodusDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Marca>(e =>
            {
                e.ToTable("marca"); e.HasKey(x => x.IdMarca);
                e.Property(x => x.IdMarca).HasColumnName("id_marca");
                e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
                e.Property(x => x.PaisOrigen).HasColumnName("pais_origen").HasMaxLength(100);
                e.Property(x => x.ContactoSoporte).HasColumnName("contacto_soporte").HasMaxLength(100);
                e.Property(x => x.TelefonoSoporte).HasColumnName("telefono_soporte").HasMaxLength(50);
                e.Property(x => x.EmailSoporte).HasColumnName("email_soporte").HasMaxLength(100);
            });

            modelBuilder.Entity<TipoActivo>(e =>
            {
                e.ToTable("tipo_activo"); e.HasKey(x => x.IdTipo);
                e.Property(x => x.IdTipo).HasColumnName("id_tipo");
                e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
                e.Property(x => x.Categoria).HasColumnName("categoria").HasMaxLength(100).IsRequired();
            });

            modelBuilder.Entity<EstadoEquipo>(e =>
            {
                e.ToTable("estado_equipo"); e.HasKey(x => x.IdEstado);
                e.Property(x => x.IdEstado).HasColumnName("id_estado");
                e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(50).IsRequired();
                e.Property(x => x.Descripcion).HasColumnName("descripcion").HasMaxLength(200);
                e.Property(x => x.ColorSemaforo).HasColumnName("color_semaforo").HasMaxLength(20).IsRequired();
                e.Property(x => x.InhabilitaOperacion).HasColumnName("inhabilita_operacion").IsRequired();
            });

            modelBuilder.Entity<Servicio>(e =>
            {
                e.ToTable("servicio"); e.HasKey(x => x.IdServicio);
                e.Property(x => x.IdServicio).HasColumnName("id_servicio");
                e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
                e.Property(x => x.Sector).HasColumnName("sector").HasMaxLength(100);
            });

            modelBuilder.Entity<Usuario>(e =>
            {
                e.ToTable("usuario"); e.HasKey(x => x.IdUsuario);
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
                e.Property(x => x.Rol).HasColumnName("rol").HasMaxLength(50).IsRequired();
                e.Property(x => x.Email).HasColumnName("email").HasMaxLength(100).IsRequired();
                e.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(200).IsRequired();
            });

            modelBuilder.Entity<Insumo>(e =>
            {
                e.ToTable("insumo"); e.HasKey(x => x.IdInsumo);
                e.Property(x => x.IdInsumo).HasColumnName("id_insumo");
                e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
                e.Property(x => x.Tipo).HasColumnName("tipo").HasMaxLength(50).IsRequired();
                e.Property(x => x.StockActual).HasColumnName("stock_actual").IsRequired();
                e.Property(x => x.StockMinimo).HasColumnName("stock_minimo").IsRequired();
            });

            modelBuilder.Entity<Equipo>(e =>
            {
                e.ToTable("equipo"); e.HasKey(x => x.IdEquipo);
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.Property(x => x.Modelo).HasColumnName("modelo").HasMaxLength(100).IsRequired();
                e.Property(x => x.NroSerie).HasColumnName("nro_serie").HasMaxLength(100).IsRequired();
                e.Property(x => x.FechaAdquisicion).HasColumnName("fecha_adquisicion").IsRequired();
                e.Property(x => x.VencimientoGarantia).HasColumnName("vencimiento_garantia");
                e.Property(x => x.IdMarca).HasColumnName("id_marca");
                e.Property(x => x.IdTipo).HasColumnName("id_tipo");
                e.Property(x => x.IdEstado).HasColumnName("id_estado");
                e.HasIndex(x => x.NroSerie).IsUnique();
                e.HasOne(x => x.Marca).WithMany(m => m.Equipos).HasForeignKey(x => x.IdMarca).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.TipoActivo).WithMany(t => t.Equipos).HasForeignKey(x => x.IdTipo).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.EstadoEquipo).WithMany(es => es.Equipos).HasForeignKey(x => x.IdEstado).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<EquipoComponente>(e =>
            {
                e.ToTable("equipo_componente"); e.HasKey(x => x.IdEquipoComponente);
                e.Property(x => x.IdEquipoComponente).HasColumnName("id_equipo_componente");
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.Property(x => x.Componente).HasColumnName("componente").HasMaxLength(200).IsRequired();
                e.Property(x => x.Categoria).HasColumnName("categoria").HasMaxLength(100);
                e.Property(x => x.Requerimiento).HasColumnName("requerimiento").HasMaxLength(30);
                e.HasOne(x => x.Equipo).WithMany(eq => eq.EquipoComponentes).HasForeignKey(x => x.IdEquipo).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<HospitalExterno>(e =>
            {
                e.ToTable("hospital_externo"); e.HasKey(x => x.IdHospital);
                e.Property(x => x.IdHospital).HasColumnName("id_hospital");
                e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(150).IsRequired();
                e.Property(x => x.Localidad).HasColumnName("localidad").HasMaxLength(100);
                e.Property(x => x.Direccion).HasColumnName("direccion").HasMaxLength(200);
                e.Property(x => x.Contacto).HasColumnName("contacto").HasMaxLength(100);
                e.Property(x => x.Telefono).HasColumnName("telefono").HasMaxLength(50);
                e.Property(x => x.Email).HasColumnName("email").HasMaxLength(100);
                e.Property(x => x.Latitud).HasColumnName("latitud");
                e.Property(x => x.Longitud).HasColumnName("longitud");
                e.Property(x => x.Activo).HasColumnName("activo").IsRequired();
            });

            modelBuilder.Entity<Prestamo>(e =>
            {
                e.ToTable("prestamo"); e.HasKey(x => x.IdPrestamo);
                e.Property(x => x.IdPrestamo).HasColumnName("id_prestamo");
                e.Property(x => x.FechaPrestamo).HasColumnName("fecha_prestamo").IsRequired();
                e.Property(x => x.FechaEstimadaDevolucion).HasColumnName("fecha_estimada_devolucion");
                e.Property(x => x.FechaEstimadaDevolucionOriginal).HasColumnName("fecha_estimada_devolucion_original");
                e.Property(x => x.FechaDevolucionReal).HasColumnName("fecha_devolucion_real");
                e.Property(x => x.Estado).HasColumnName("estado").HasMaxLength(30).IsRequired();
                e.Property(x => x.Motivo).HasColumnName("motivo").HasMaxLength(100);
                e.Property(x => x.Observaciones).HasColumnName("observaciones");
                e.Property(x => x.NumeroRemito).HasColumnName("numero_remito").HasMaxLength(20).IsRequired();
                e.Property(x => x.RutaRemitoPdf).HasColumnName("ruta_remito_pdf").HasMaxLength(300);
                e.Property(x => x.FechaEmisionRemito).HasColumnName("fecha_emision_remito");
                e.HasIndex(x => x.NumeroRemito).IsUnique();
                e.Property(x => x.RutaRemitoSalidaFirmado).HasColumnName("ruta_remito_salida_firmado").HasMaxLength(300);
                e.Property(x => x.FechaCargaFirmaSalida).HasColumnName("fecha_carga_firma_salida");
                e.Property(x => x.NumeroRemitoDevolucion).HasColumnName("numero_remito_devolucion").HasMaxLength(20);
                e.HasIndex(x => x.NumeroRemitoDevolucion).IsUnique();
                e.Property(x => x.RutaRemitoDevolucionPdf).HasColumnName("ruta_remito_devolucion_pdf").HasMaxLength(300);
                e.Property(x => x.ObservacionesDevolucion).HasColumnName("observaciones_devolucion");
                e.Property(x => x.RutaRemitoDevolucionFirmado).HasColumnName("ruta_remito_devolucion_firmado").HasMaxLength(300);
                e.Property(x => x.FechaCargaFirmaDevolucion).HasColumnName("fecha_carga_firma_devolucion");
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.Property(x => x.IdHospital).HasColumnName("id_hospital");
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.HasOne(x => x.Equipo).WithMany(eq => eq.Prestamos).HasForeignKey(x => x.IdEquipo).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Hospital).WithMany(h => h.Prestamos).HasForeignKey(x => x.IdHospital).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PrestamoComponente>(e =>
            {
                e.ToTable("prestamo_componente"); e.HasKey(x => x.IdPrestamoComponente);
                e.Property(x => x.IdPrestamoComponente).HasColumnName("id_prestamo_componente");
                e.Property(x => x.IdPrestamo).HasColumnName("id_prestamo");
                e.Property(x => x.Componente).HasColumnName("componente").HasMaxLength(200).IsRequired();
                e.HasOne(x => x.Prestamo).WithMany(p => p.PrestamoComponentes).HasForeignKey(x => x.IdPrestamo).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ProrrogaPrestamo>(e =>
            {
                e.ToTable("prorroga_prestamo"); e.HasKey(x => x.IdProrroga);
                e.Property(x => x.IdProrroga).HasColumnName("id_prorroga");
                e.Property(x => x.IdPrestamo).HasColumnName("id_prestamo");
                e.Property(x => x.FechaAnterior).HasColumnName("fecha_anterior");
                e.Property(x => x.FechaNueva).HasColumnName("fecha_nueva").IsRequired();
                e.Property(x => x.Motivo).HasColumnName("motivo").HasMaxLength(300).IsRequired();
                e.Property(x => x.FechaSolicitud).HasColumnName("fecha_solicitud").IsRequired();
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.HasOne(x => x.Prestamo).WithMany(p => p.Prorrogas).HasForeignKey(x => x.IdPrestamo).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<RemitoContador>(e =>
            {
                e.ToTable("remito_contador"); e.HasKey(x => new { x.Tipo, x.Anio });
                e.Property(x => x.Tipo).HasColumnName("tipo").HasMaxLength(3);
                e.Property(x => x.Anio).HasColumnName("anio").ValueGeneratedNever();
                e.Property(x => x.UltimoNumero).HasColumnName("ultimo_numero").IsRequired();
            });

            modelBuilder.Entity<OrdenTrabajo>(e =>
            {
                e.ToTable("orden_trabajo"); e.HasKey(x => x.IdOT);
                e.Property(x => x.IdOT).HasColumnName("id_ot");
                e.Property(x => x.FechaApertura).HasColumnName("fecha_apertura").IsRequired();
                e.Property(x => x.Tipo).HasColumnName("tipo").HasMaxLength(50).IsRequired();
                e.Property(x => x.Sintoma).HasColumnName("sintoma").IsRequired();
                e.Property(x => x.Estado).HasColumnName("estado").HasMaxLength(50).IsRequired();
                e.Property(x => x.FechaCierre).HasColumnName("fecha_cierre");
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.Property(x => x.IdServicio).HasColumnName("id_servicio");
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.HasOne(x => x.Equipo).WithMany(eq => eq.OrdenesTrabajo).HasForeignKey(x => x.IdEquipo).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Servicio).WithMany().HasForeignKey(x => x.IdServicio).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Intervencion>(e =>
            {
                e.ToTable("intervencion"); e.HasKey(x => x.IdIntervencion);
                e.Property(x => x.IdIntervencion).HasColumnName("id_intervencion");
                e.Property(x => x.TareasRealizadas).HasColumnName("tareas_realizadas").IsRequired();
                e.Property(x => x.TiempoEmpleado).HasColumnName("tiempo_empleado").IsRequired();
                e.Property(x => x.ResultadoSegElectrica).HasColumnName("resultado_seg_electrica").HasMaxLength(100).IsRequired();
                e.Property(x => x.Fecha).HasColumnName("fecha").IsRequired();
                e.Property(x => x.FechaFin).HasColumnName("fecha_fin");
                e.Property(x => x.IdOT).HasColumnName("id_ot");
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.HasOne(x => x.OrdenTrabajo).WithMany(ot => ot.Intervenciones).HasForeignKey(x => x.IdOT).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Sector>(e =>
            {
                e.ToTable("sector"); e.HasKey(x => x.IdSector);
                e.Property(x => x.IdSector).HasColumnName("id_sector");
                e.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
                e.Property(x => x.Descripcion).HasColumnName("descripcion").HasMaxLength(250);
                e.Property(x => x.Activo).HasColumnName("activo").IsRequired();
            });

            modelBuilder.Entity<Ubicacion>(e =>
            {
                e.ToTable("ubicacion"); e.HasKey(x => x.IdUbicacion);
                e.Property(x => x.IdUbicacion).HasColumnName("id_ubicacion");
                e.Property(x => x.FechaTraslado).HasColumnName("fecha_traslado").IsRequired();
                e.Property(x => x.IdSectorAnterior).HasColumnName("id_sector_anterior");
                e.Property(x => x.IdSectorNuevo).HasColumnName("id_sector_nuevo");
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.Property(x => x.IdServicio).HasColumnName("id_servicio");
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.HasOne(x => x.Equipo).WithMany(eq => eq.Ubicaciones).HasForeignKey(x => x.IdEquipo).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Servicio).WithMany().HasForeignKey(x => x.IdServicio).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.SectorAnterior).WithMany().HasForeignKey(x => x.IdSectorAnterior).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.SectorNuevo).WithMany().HasForeignKey(x => x.IdSectorNuevo).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<BajaPatrimonial>(e =>
            {
                e.ToTable("baja_patrimonial"); e.HasKey(x => x.IdBaja);
                e.Property(x => x.IdBaja).HasColumnName("id_baja");
                e.Property(x => x.Fecha).HasColumnName("fecha").IsRequired();
                e.Property(x => x.Motivo).HasColumnName("motivo").IsRequired();
                e.Property(x => x.InformeObsolescencia).HasColumnName("informe_obsolescencia").IsRequired();
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.HasOne(x => x.Equipo).WithMany(eq => eq.Bajas).HasForeignKey(x => x.IdEquipo).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<UsoInsumo>(e =>
            {
                e.ToTable("uso_insumo"); e.HasKey(x => x.IdUso);
                e.Property(x => x.IdUso).HasColumnName("id_uso");
                e.Property(x => x.Cantidad).HasColumnName("cantidad").IsRequired();
                e.Property(x => x.IdInsumo).HasColumnName("id_insumo");
                e.Property(x => x.IdOT).HasColumnName("id_ot");
                e.HasOne(x => x.Insumo).WithMany().HasForeignKey(x => x.IdInsumo).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.OrdenTrabajo).WithMany(ot => ot.UsosInsumo).HasForeignKey(x => x.IdOT).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<HojaDeVida>(e =>
            {
                e.ToTable("hoja_de_vida"); e.HasKey(x => x.IdHoja);
                e.Property(x => x.IdHoja).HasColumnName("id_hoja");
                e.Property(x => x.FechaApertura).HasColumnName("fecha_apertura").IsRequired();
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.HasOne(x => x.Equipo).WithMany().HasForeignKey(x => x.IdEquipo).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Alerta>(e =>
            {
                e.ToTable("alerta"); e.HasKey(x => x.IdAlerta);
                e.Property(x => x.IdAlerta).HasColumnName("id_alerta");
                e.Property(x => x.Tipo).HasColumnName("tipo").HasMaxLength(100).IsRequired();
                e.Property(x => x.FechaGeneracion).HasColumnName("fecha_generacion").IsRequired();
                e.Property(x => x.Estado).HasColumnName("estado").HasMaxLength(50).IsRequired();
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.HasOne(x => x.Equipo).WithMany(eq => eq.Alertas).HasForeignKey(x => x.IdEquipo).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ReporteFalla>(e =>
            {
                e.ToTable("reporte_falla"); e.HasKey(x => x.IdReporteFalla);
                e.Property(x => x.IdReporteFalla).HasColumnName("id_reporte_falla");
                e.Property(x => x.IdEquipo).HasColumnName("id_equipo");
                e.Property(x => x.IdUsuario).HasColumnName("id_usuario");
                e.Property(x => x.NombreCompleto).HasColumnName("nombre_completo").HasMaxLength(100).IsRequired();
                e.Property(x => x.Legajo).HasColumnName("legajo").HasMaxLength(30).IsRequired();
                e.Property(x => x.Descripcion).HasColumnName("descripcion").HasMaxLength(1000).IsRequired();
                e.Property(x => x.FechaReporte).HasColumnName("fecha_reporte").IsRequired();
                e.Property(x => x.FechaDia).HasColumnName("fecha_dia").IsRequired();
                e.Property(x => x.Estado).HasColumnName("estado").HasMaxLength(30).IsRequired()
                    .HasDefaultValue(ReporteFalla.ESTADO_PENDIENTE);
                e.Property(x => x.IdOT).HasColumnName("id_ot");
                e.Property(x => x.IdServicio).HasColumnName("id_servicio");

                e.HasIndex(x => new { x.IdEquipo, x.FechaDia })
                    .IsUnique()
                    .HasFilter("estado <> 'Descartado'")
                    .HasDatabaseName(ReporteFalla.INDICE_UNO_POR_DIA);
                e.HasIndex(x => x.Estado);
                e.HasOne(x => x.Equipo).WithMany().HasForeignKey(x => x.IdEquipo).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Servicio).WithMany().HasForeignKey(x => x.IdServicio).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.OrdenTrabajo).WithMany().HasForeignKey(x => x.IdOT).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<EstadoEquipo>().HasData(
                new EstadoEquipo { IdEstado = 1, Nombre = "En servicio", ColorSemaforo = "verde", InhabilitaOperacion = false, Descripcion = "Equipo operativo y disponible" },
                new EstadoEquipo { IdEstado = 2, Nombre = "En mantenimiento", ColorSemaforo = "amarillo", InhabilitaOperacion = true, Descripcion = "Equipo con orden de trabajo en curso" },
                new EstadoEquipo { IdEstado = 3, Nombre = "Fuera de servicio", ColorSemaforo = "rojo", InhabilitaOperacion = true, Descripcion = "Equipo con orden de trabajo pendiente, aún no iniciada" },
                new EstadoEquipo { IdEstado = 4, Nombre = "En préstamo", ColorSemaforo = "azul", InhabilitaOperacion = false, Descripcion = "Cedido temporalmente" },
                new EstadoEquipo { IdEstado = 5, Nombre = "Baja patrimonial", ColorSemaforo = "gris", InhabilitaOperacion = true, Descripcion = "Dado de baja definitivamente" }
            );

            modelBuilder.Entity<Marca>().HasData(
                new Marca { IdMarca = 1, Nombre = "Maquet / Getinge", PaisOrigen = "Alemania", ContactoSoporte = "Getinge Latam", TelefonoSoporte = "+54 11 4000-1200", EmailSoporte = "soporte.ar@getinge.com" },
                new Marca { IdMarca = 2, Nombre = "Philips Healthcare", PaisOrigen = "Países Bajos", ContactoSoporte = "Philips Argentina", TelefonoSoporte = "+54 11 4319-3000", EmailSoporte = "healthcare.ar@philips.com" },
                new Marca { IdMarca = 3, Nombre = "Fresenius Kabi", PaisOrigen = "Alemania", ContactoSoporte = "Fresenius Argentina", TelefonoSoporte = "+54 11 5235-8800", EmailSoporte = "soporte@fresenius.com.ar" },
                new Marca { IdMarca = 4, Nombre = "Dräger", PaisOrigen = "Alemania", ContactoSoporte = "Dräger Argentina", TelefonoSoporte = "+54 11 4788-3500", EmailSoporte = "soporte.ar@draeger.com" }
            );

            modelBuilder.Entity<TipoActivo>().HasData(
                new TipoActivo { IdTipo = 1, Nombre = "Ventilador mecánico", Categoria = "Soporte vital" },
                new TipoActivo { IdTipo = 2, Nombre = "Monitor multiparamétrico", Categoria = "Diagnóstico" },
                new TipoActivo { IdTipo = 3, Nombre = "Bomba de infusión", Categoria = "Soporte vital" },
                new TipoActivo { IdTipo = 4, Nombre = "Electrobisturí", Categoria = "Quirúrgico" },
                new TipoActivo { IdTipo = 5, Nombre = "Incubadora neonatal", Categoria = "Soporte vital" }
            );

            modelBuilder.Entity<Servicio>().HasData(
                new Servicio { IdServicio = 1, Nombre = "UTIN", Sector = "Neonatología piso 3" },
                new Servicio { IdServicio = 2, Nombre = "UTIA", Sector = "Terapia intensiva piso 4" },
                new Servicio { IdServicio = 3, Nombre = "Quirófano central", Sector = "Bloque quirúrgico piso 2" },
                new Servicio { IdServicio = 4, Nombre = "Guardia", Sector = "Planta baja" }
            );

            modelBuilder.Entity<Insumo>().HasData(
                new Insumo { IdInsumo = 1, Nombre = "Sensor de O2 SERVO-i", Tipo = "Sensor", StockActual = 8, StockMinimo = 5 },
                new Insumo { IdInsumo = 2, Nombre = "Filtro bacteriano HME", Tipo = "Sensor", StockActual = 3, StockMinimo = 10 },
                new Insumo { IdInsumo = 3, Nombre = "Cable SpO2 adulto", Tipo = "Accesorio", StockActual = 12, StockMinimo = 4 }
            );

            modelBuilder.Entity<Sector>().HasData(
                new Sector { IdSector = 1, Nombre = "Terapia Intensiva Adultos - UTIA", Descripcion = "Sector de cuidados intensivos para adultos", Activo = true },
                new Sector { IdSector = 2, Nombre = "Terapia Intensiva Neonatal - UTIN", Descripcion = "Sector de cuidados intensivos neonatales", Activo = true },
                new Sector { IdSector = 3, Nombre = "Quirófano 1", Descripcion = "Quirófano principal bloque central", Activo = true },
                new Sector { IdSector = 4, Nombre = "Quirófano 2", Descripcion = "Quirófano secundario bloque central", Activo = true },
                new Sector { IdSector = 5, Nombre = "Guardia - Shock Room", Descripcion = "Sala de shock de la guardia", Activo = true },
                new Sector { IdSector = 6, Nombre = "Internación piso 3", Descripcion = "Sala general piso 3", Activo = true }
            );
        }
    }
}