using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class SupportAccountReactivation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AdminAudit_Action",
                schema: "ntc",
                table: "AdministrativeAuditEvents");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AdminAudit_Action",
                schema: "ntc",
                table: "AdministrativeAuditEvents",
                sql: "\"Action\" BETWEEN 1 AND 12");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AdminAudit_Action",
                schema: "ntc",
                table: "AdministrativeAuditEvents");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AdminAudit_Action",
                schema: "ntc",
                table: "AdministrativeAuditEvents",
                sql: "\"Action\" BETWEEN 1 AND 11");
        }
    }
}
