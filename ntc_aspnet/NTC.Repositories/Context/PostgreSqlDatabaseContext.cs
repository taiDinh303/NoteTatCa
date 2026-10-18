using Microsoft.EntityFrameworkCore;
using NTC.Core.Security;
namespace NTC.Repositories.Context;
public sealed class PostgreSqlDatabaseContext(DbContextOptions<PostgreSqlDatabaseContext> options,
    TimeProvider? clock = null, ICurrentUser? actor = null) : DatabaseContext(options, clock, actor);
