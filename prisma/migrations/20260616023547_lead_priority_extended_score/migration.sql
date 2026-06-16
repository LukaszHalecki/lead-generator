-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('HOT', 'WARM', 'COLD');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "latestLeadPriority" "LeadPriority";

-- AlterTable
ALTER TABLE "company_analyses" ADD COLUMN     "domainAgeYears" INTEGER,
ADD COLUMN     "hasFavicon" BOOLEAN,
ADD COLUMN     "hasGoogleTagManager" BOOLEAN,
ADD COLUMN     "hasPrivacyPolicy" BOOLEAN,
ADD COLUMN     "hasSecurityCertificate" BOOLEAN,
ADD COLUMN     "isTechnologyModern" BOOLEAN;

-- CreateIndex
CREATE INDEX "companies_organizationId_latestLeadPriority_idx" ON "companies"("organizationId", "latestLeadPriority");
