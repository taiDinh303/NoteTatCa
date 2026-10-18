FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source
# Keep dependency restore cached; copy only the seven API projects.
COPY ntc_aspnet/NTC.API/*.csproj ntc_aspnet/NTC.API/
COPY ntc_aspnet/NTC.Contract.Repositories/*.csproj ntc_aspnet/NTC.Contract.Repositories/
COPY ntc_aspnet/NTC.Contract.Services/*.csproj ntc_aspnet/NTC.Contract.Services/
COPY ntc_aspnet/NTC.Core/*.csproj ntc_aspnet/NTC.Core/
COPY ntc_aspnet/NTC.ModelViews/*.csproj ntc_aspnet/NTC.ModelViews/
COPY ntc_aspnet/NTC.Repositories/*.csproj ntc_aspnet/NTC.Repositories/
COPY ntc_aspnet/NTC.Services/*.csproj ntc_aspnet/NTC.Services/
RUN dotnet restore ntc_aspnet/NTC.API/NTC.API.csproj
COPY ntc_aspnet/NTC.API/ ntc_aspnet/NTC.API/
COPY ntc_aspnet/NTC.Contract.Repositories/ ntc_aspnet/NTC.Contract.Repositories/
COPY ntc_aspnet/NTC.Contract.Services/ ntc_aspnet/NTC.Contract.Services/
COPY ntc_aspnet/NTC.Core/ ntc_aspnet/NTC.Core/
COPY ntc_aspnet/NTC.ModelViews/ ntc_aspnet/NTC.ModelViews/
COPY ntc_aspnet/NTC.Repositories/ ntc_aspnet/NTC.Repositories/
COPY ntc_aspnet/NTC.Services/ ntc_aspnet/NTC.Services/
RUN dotnet publish ntc_aspnet/NTC.API/NTC.API.csproj -c Release --no-restore -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
COPY deploy/certificates/supabase-prod-ca-2021.crt /app/certificates/supabase-prod-ca-2021.crt
ENV ASPNETCORE_ENVIRONMENT=Production
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet NTC.API.dll"]
