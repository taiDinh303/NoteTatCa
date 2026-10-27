using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using NTC.Contract.Repositories.IUOW;
using NTC.Core.Security;
using NTC.API.Jobs;
using NTC.Contract.Repositories;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Services.Interface;
using NTC.Repositories.Context;
using NTC.Services.Mascots;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;

public sealed class MascotAiTests
{
    private sealed class Actor(Guid id) : ICurrentUser
    {
        public bool IsAuthenticated => true;
        public Guid? UserId => id;
        public Guid? SessionId => null;
        public string Name => "Synthetic user";
        public bool IsInRole(string role) => false;
    }
    public sealed class FakeGenerator : IMascotImageGenerator
    {
        public int Calls { get; private set; }
        public bool Fail { get; set; }
        public byte[]? LastReference { get; private set; }
        public Task<MascotImages> GenerateAsync(Guid userId, string description, byte[]? photo, CancellationToken token)
        {
            Calls++;
            LastReference = photo;
            if (Fail) throw new MascotProviderException("PROVIDER_UNAVAILABLE");
            return Task.FromResult(new MascotImages([1, 2], [3, 4]));
        }
    }
    private static ApiFactory Fixture(FakeGenerator fake, bool enabled = true) => new() { ConfigureExtra = services =>
    {
        services.PostConfigure<MascotAiOptions>(o => { o.Enabled = enabled; o.OpenAiApiKey = "synthetic-provider-key"; });
        services.RemoveAll<IMascotImageGenerator>(); services.AddSingleton<IMascotImageGenerator>(fake);
        foreach (var worker in services.Where(d => d.ServiceType == typeof(IHostedService) && d.ImplementationType == typeof(MascotGenerationWorker)).ToArray()) services.Remove(worker);
    }};
    private static object Request(Guid? id = null, bool consent = true) => new { requestId = id ?? Guid.NewGuid(), description = "A synthetic blue owl", consentToSendToOpenAi = consent };

    [Fact]
    public async Task Unconfigured_creation_and_missing_consent_do_not_reserve_or_call_a_provider()
    {
        var fake = new FakeGenerator(); using var f = Fixture(fake, false); await f.InitializeAsync();
        var (a, _) = await f.LoginAsync(); using var client = a;
        var status = await ApiFactory.Data(await a.GetAsync("/api/v1/mascot-ai/status"));
        Assert.False(status.GetProperty("available").GetBoolean());
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request())).StatusCode);
        using var scope = f.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Set<MascotGeneration>().AnyAsync());
        Assert.Equal(0, fake.Calls);
    }

    [Fact]
    public async Task Durable_daily_slot_is_owner_scoped_idempotent_and_survives_provider_failure()
    {
        var fake = new FakeGenerator(); using var f = Fixture(fake); await f.InitializeAsync();
        var (a, _) = await f.LoginAsync(); using var ca = a;
        var (b, _) = await f.LoginAsync("b@example.test"); using var cb = b;
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var cad = admin;
        using var anonymous = f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/mascot-ai/status")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request(consent: false))).StatusCode);
        var requestId = Guid.NewGuid();
        var first = await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request(requestId)));
        var id = first.GetProperty("id").GetGuid();
        var duplicate = await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request(requestId)));
        Assert.Equal(id, duplicate.GetProperty("id").GetGuid());
        Assert.Equal(HttpStatusCode.TooManyRequests, (await a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/mascot-ai/generations/{id}/result")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await a.GetAsync($"/api/v1/mascot-ai/generations/{id}/result")).StatusCode);
        using (var scope = f.Services.CreateScope())
            Assert.True(await scope.ServiceProvider.GetRequiredService<MascotGenerationProcessor>().ProcessNextAsync(default));
        var result = await ApiFactory.Data(await a.GetAsync($"/api/v1/mascot-ai/generations/{id}/result"));
        Assert.Equal(Convert.ToBase64String([1, 2]), result.GetProperty("directionsPngBase64").GetString());
        Assert.Equal(1, fake.Calls);
        using (var scope = f.Services.CreateScope())
        {
            var stored = await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Set<MascotGeneration>().SingleAsync();
            Assert.Null(stored.ReferenceImage); Assert.Equal("", stored.Description); Assert.Equal("ready", stored.State);
        }
        // A different user has an independent slot; failure still consumes that slot.
        fake.Fail = true;
        await ApiFactory.Data(await b.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request()));
        using (var scope = f.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<MascotGenerationProcessor>().ProcessNextAsync(default);
        var failed = await ApiFactory.Data(await b.GetAsync("/api/v1/mascot-ai/status"));
        Assert.Equal("failed", failed.GetProperty("latest").GetProperty("state").GetString());
        Assert.False(failed.GetProperty("canCreate").GetBoolean());
        Assert.Equal(HttpStatusCode.TooManyRequests, (await b.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request())).StatusCode);
        f.Clock.Advance(TimeSpan.FromDays(1));
        using (var scope = f.Services.CreateScope())
        {
            // JWT wall-clock validation is independent of the service's synthetic clock.
            var service = new MascotAiService(scope.ServiceProvider.GetRequiredService<IUnitOfWork>(), new Actor(f.A), f.Clock,
                scope.ServiceProvider.GetRequiredService<IMascotGenerationStore>(), Options.Create(new MascotAiOptions { Enabled = true, OpenAiApiKey = "synthetic" }));
            Assert.True((await service.StatusAsync(default)).CanEdit);
            await service.CreateAsync(new() { RequestId = Guid.NewGuid(), ReplacesId = id, Description = "An owl", ConsentToSendToOpenAi = true }, default);
        }
        Assert.Equal(2, fake.Calls); // Creating a queued job never calls AI inside the request.
    }
    [Fact]
    public async Task One_permanent_custom_slot_can_be_edited_or_deleted_but_deletion_does_not_refund_daily_usage()
    {
        var fake = new FakeGenerator(); using var f = Fixture(fake); await f.InitializeAsync();
        var (a, _) = await f.LoginAsync(); using var client = a;
        var (b, _) = await f.LoginAsync("b@example.test"); using var other = b;
        var created = await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request()));
        var id = created.GetProperty("id").GetGuid();
        byte[] bytes = new byte[24]; System.Text.Encoding.ASCII.GetBytes("RIFF").CopyTo(bytes, 0); System.Text.Encoding.ASCII.GetBytes("WEBP").CopyTo(bytes, 8);
        var applyBody = new NTC.ModelViews.Mascots.ApplyMascotRequest { DirectionsWebpBase64 = Convert.ToBase64String(bytes), ReactionsWebpBase64 = Convert.ToBase64String(bytes) };
        using (var scope = f.Services.CreateScope()) await scope.ServiceProvider.GetRequiredService<MascotGenerationProcessor>().ProcessNextAsync(default);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PostAsJsonAsync($"/api/v1/mascot-ai/generations/{id}/apply", applyBody)).StatusCode);
        await ApiFactory.Data(await a.PostAsJsonAsync($"/api/v1/mascot-ai/generations/{id}/apply", applyBody));
        await ApiFactory.Data(await a.PostAsJsonAsync($"/api/v1/mascot-ai/generations/{id}/apply", applyBody));
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync($"/api/v1/mascot-ai/slot/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync("/api/v1/mascot-ai/slot/result")).StatusCode);
        Assert.Equal(id, (await ApiFactory.Data(await a.GetAsync("/api/v1/mascot-ai/slot/result"))).GetProperty("id").GetGuid());
        f.Clock.Advance(TimeSpan.FromDays(31));
        using var scope2 = f.Services.CreateScope();
        var store = scope2.ServiceProvider.GetRequiredService<IMascotGenerationStore>();
        await store.ExpireAsync(f.Clock.GetUtcNow(), default);
        var service = new MascotAiService(scope2.ServiceProvider.GetRequiredService<IUnitOfWork>(), new Actor(f.A), f.Clock, store,
            Options.Create(new MascotAiOptions { Enabled = true, OpenAiApiKey = "synthetic" }));
        Assert.Equal(id, (await service.SavedAsync(default)).Id); // Applied artwork does not expire with raw previews.
        Assert.False((await service.StatusAsync(default)).CanCreate);
        Assert.True((await service.StatusAsync(default)).CanEdit);
        var conflict = await Assert.ThrowsAsync<NTC.Core.Base.BaseException.ErrorException>(() => service.CreateAsync(new() { RequestId = Guid.NewGuid(), Description = "A second mascot", ConsentToSendToOpenAi = true }, default));
        Assert.Equal(409, conflict.StatusCode);
        var edit = await service.CreateAsync(new() { RequestId = Guid.NewGuid(), ReplacesId = id, Description = "Add blue glasses", ConsentToSendToOpenAi = true }, default);
        await scope2.ServiceProvider.GetRequiredService<MascotGenerationProcessor>().ProcessNextAsync(default);
        Assert.Equal(bytes, fake.LastReference);
        Assert.Equal(id, (await service.SavedAsync(default)).Id); // Preserve the old mascot until Apply.
        await service.ApplyAsync(edit.Id, applyBody, default);
        Assert.Equal(edit.Id, (await service.SavedAsync(default)).Id);
        var db = scope2.ServiceProvider.GetRequiredService<DatabaseContext>();
        Assert.Equal(1, await db.Set<MascotGeneration>().CountAsync(x => x.UserId == f.A && x.OccupiesSlot));
        await service.DeleteAsync(edit.Id, default);
        Assert.Null((await service.StatusAsync(default)).Slot);
        Assert.False((await service.StatusAsync(default)).CanCreate);
        var limited = await Assert.ThrowsAsync<NTC.Core.Base.BaseException.ErrorException>(() => service.CreateAsync(new() { RequestId = Guid.NewGuid(), Description = "A new mascot", ConsentToSendToOpenAi = true }, default));
        Assert.Equal(429, limited.StatusCode);
        f.Clock.Advance(TimeSpan.FromDays(1));
        Assert.True((await service.StatusAsync(default)).CanCreate);
        await service.CreateAsync(new() { RequestId = Guid.NewGuid(), Description = "A new mascot", ConsentToSendToOpenAi = true }, default);
        Assert.Equal(1, await db.Set<MascotGeneration>().CountAsync(x => x.UserId == f.A && x.OccupiesSlot));
    }

    [Fact]
    public async Task Concurrent_requests_reserve_only_one_daily_slot()
    {
        var fake = new FakeGenerator(); using var f = Fixture(fake); await f.InitializeAsync();
        var (a, _) = await f.LoginAsync(); using var client = a;
        var responses = await Task.WhenAll(a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request()), a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request()));
        Assert.Single(responses, x => x.IsSuccessStatusCode);
        Assert.Single(responses, x => x.StatusCode == HttpStatusCode.TooManyRequests);
        using var scope = f.Services.CreateScope();
        Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Set<MascotGeneration>().CountAsync());
        Assert.Equal(0, fake.Calls);
    }
    [Fact]
    public async Task Interrupted_paid_work_is_not_retried_and_old_images_are_expired()
    {
        var fake = new FakeGenerator(); using var f = Fixture(fake); await f.InitializeAsync();
        var (a, _) = await f.LoginAsync(); using var client = a;
        await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/mascot-ai/generations", Request()));
        using (var scope = f.Services.CreateScope())
            Assert.NotNull(await scope.ServiceProvider.GetRequiredService<IMascotGenerationStore>().ClaimAsync(f.Clock.GetUtcNow(), default));
        f.Clock.Advance(TimeSpan.FromMinutes(13));
        using (var scope = f.Services.CreateScope())
        {
            Assert.False(await scope.ServiceProvider.GetRequiredService<MascotGenerationProcessor>().ProcessNextAsync(default));
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            Assert.Equal("failed", (await db.Set<MascotGeneration>().SingleAsync()).State);
        }
        f.Clock.Advance(TimeSpan.FromDays(8));
        using (var scope = f.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<IMascotGenerationStore>().ExpireAsync(f.Clock.GetUtcNow(), default);
            var expired = await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Set<MascotGeneration>().SingleAsync();
            Assert.Equal("expired", expired.State); Assert.Null(expired.DirectionsPng); Assert.Equal("", expired.Description);
        }
        Assert.Equal(0, fake.Calls);
    }
}
