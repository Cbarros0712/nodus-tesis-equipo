using System.IO;
using System.Windows;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NODUS.Data;

namespace NODUS.WPF
{
    public partial class App : Application
    {
        public static NodusDbContext DbContext { get; private set; } = null!;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .Build();

            var connectionString = configuration.GetConnectionString("NodusDB");

            var options = new DbContextOptionsBuilder<NodusDbContext>()
                .UseNpgsql(connectionString)
                .Options;

            DbContext = new NodusDbContext(options);
        }
    }
}