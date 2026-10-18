using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using NTC.Contract.Repositories.IUOW;
using NTC.Repositories.Context;
namespace NTC.Repositories.UOW;
public sealed class UnitOfWork(DatabaseContext context) : IUnitOfWork
{
    private readonly Dictionary<Type, object> _repositories = new();
    private IDbContextTransaction? _transaction;
    public IGenericRepository<T> GetRepository<T>() where T : class
    {
        if (!_repositories.TryGetValue(typeof(T), out var repository))
            _repositories[typeof(T)] = repository = new GenericRepository<T>(context);
        return (IGenericRepository<T>)repository;
    }
    public void Save() => context.SaveChanges();
    public async Task SaveAsync() => await context.SaveChangesAsync();
    public async Task BeginTransactionAsync()
    {
        if (_transaction != null) throw new InvalidOperationException("Nested transactions are not supported.");
        _transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
    }
    public async Task CommitTransactionAsync()
    {
        if (_transaction == null) return;
        await _transaction.CommitAsync(); await _transaction.DisposeAsync(); _transaction = null;
    }
    public async Task RollBackAsync()
    {
        if (_transaction == null) return;
        await _transaction.RollbackAsync(); await _transaction.DisposeAsync(); _transaction = null;
        context.ChangeTracker.Clear();
    }
    public void BeginTransaction() => BeginTransactionAsync().GetAwaiter().GetResult();
    public void ClearTracking() => context.ChangeTracker.Clear();
    public void CommitTransaction() => CommitTransactionAsync().GetAwaiter().GetResult();
    public void RollBack() => RollBackAsync().GetAwaiter().GetResult();
    public void Dispose() { _transaction?.Dispose(); } // DI owns the DbContext.
}
