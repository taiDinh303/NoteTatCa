namespace NTC.Contract.Repositories.IUOW
{
    public interface IUnitOfWork : IDisposable
    {
        IGenericRepository<T> GetRepository<T>() where T : class;
        void Save();
        Task SaveAsync();
        Task BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollBackAsync();
        void ClearTracking();
        void BeginTransaction();
        void CommitTransaction();
        void RollBack();
    }
}
