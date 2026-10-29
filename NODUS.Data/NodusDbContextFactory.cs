using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace NODUS.Data
{
    public class NodusDbContextFactory : IDesignTimeDbContextFactory<NodusDbContext>
    {
        public NodusDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<NodusDbContext>();
            optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=nodus_db;Username=postgres;Password=tesis26");

            return new NodusDbContext(optionsBuilder.Options);
        }
    }
}
