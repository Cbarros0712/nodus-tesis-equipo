using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;
using System.Collections.ObjectModel;
using System.Windows;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace NODUS.WPF.ViewModels
{
    public partial class MarcaViewModel : ObservableObject
    {
        private readonly NodusDbContext _db;

        public ObservableCollection<Marca> Marcas { get; set; } = new();

        [ObservableProperty]
        private Marca? _marcaSeleccionada;

        [ObservableProperty]
        private string _nombre = string.Empty;

        [ObservableProperty]
        private string _paisOrigen = string.Empty;

        [ObservableProperty]
        private string _contactoSoporte = string.Empty;

        [ObservableProperty]
        private string _telefonoSoporte = string.Empty;

        [ObservableProperty]
        private string _emailSoporte = string.Empty;

        [ObservableProperty]
        private bool _editando = false;

        public MarcaViewModel()
        {
            _db = App.DbContext;
            CargarMarcas();
        }

        private void CargarMarcas()
        {
            Marcas.Clear();
            var lista = _db.Marcas.ToList();
            foreach (var m in lista)
                Marcas.Add(m);
        }

        [RelayCommand]
        private void Guardar()
        {
            if (string.IsNullOrWhiteSpace(Nombre))
            {
                MessageBox.Show("El nombre de la marca es obligatorio.", "Validación",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (Editando && MarcaSeleccionada != null)
            {
                MarcaSeleccionada.Nombre = Nombre;
                MarcaSeleccionada.PaisOrigen = PaisOrigen;
                MarcaSeleccionada.ContactoSoporte = ContactoSoporte;
                MarcaSeleccionada.TelefonoSoporte = TelefonoSoporte;
                MarcaSeleccionada.EmailSoporte = EmailSoporte;
                _db.SaveChanges();
            }
            else
            {
                var nueva = new Marca
                {
                    Nombre = Nombre,
                    PaisOrigen = PaisOrigen,
                    ContactoSoporte = ContactoSoporte,
                    TelefonoSoporte = TelefonoSoporte,
                    EmailSoporte = EmailSoporte
                };
                _db.Marcas.Add(nueva);
                _db.SaveChanges();
            }

            LimpiarFormulario();
            CargarMarcas();
        }

        [RelayCommand]
        private void Editar()
        {
            if (MarcaSeleccionada == null) return;

            Nombre = MarcaSeleccionada.Nombre;
            PaisOrigen = MarcaSeleccionada.PaisOrigen ?? "";
            ContactoSoporte = MarcaSeleccionada.ContactoSoporte ?? "";
            TelefonoSoporte = MarcaSeleccionada.TelefonoSoporte ?? "";
            EmailSoporte = MarcaSeleccionada.EmailSoporte ?? "";
            Editando = true;
        }

        [RelayCommand]
        private void Eliminar()
        {
            if (MarcaSeleccionada == null) return;

            var tieneEquipos = _db.Equipos.Any(e => e.IdMarca == MarcaSeleccionada.IdMarca);
            if (tieneEquipos)
            {
                MessageBox.Show("No se puede eliminar esta marca porque tiene equipos asociados.",
                    "Integridad referencial", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            var result = MessageBox.Show($"¿Eliminar la marca '{MarcaSeleccionada.Nombre}'?",
                "Confirmar eliminación", MessageBoxButton.YesNo, MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                _db.Marcas.Remove(MarcaSeleccionada);
                _db.SaveChanges();
                LimpiarFormulario();
                CargarMarcas();
            }
        }

        [RelayCommand]
        private void Cancelar()
        {
            LimpiarFormulario();
        }

        private void LimpiarFormulario()
        {
            Nombre = "";
            PaisOrigen = "";
            ContactoSoporte = "";
            TelefonoSoporte = "";
            EmailSoporte = "";
            MarcaSeleccionada = null;
            Editando = false;
        }
    }
}
