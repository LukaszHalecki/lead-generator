-- CreateEnum
CREATE TYPE "EmailProviderType" AS ENUM ('PROFESSIONAL', 'GMAIL', 'OUTLOOK', 'YAHOO', 'WP_PL', 'ONET', 'INTERIA', 'O2', 'OTHER_FREE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DnsRecordType" AS ENUM ('MX', 'SPF', 'DKIM', 'DMARC');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'AUDIT_COMPLETED';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "hasDkim" BOOLEAN,
ADD COLUMN     "hasDmarc" BOOLEAN,
ADD COLUMN     "hasSpf" BOOLEAN,
ADD COLUMN     "latestEmailScore" INTEGER,
ADD COLUMN     "latestMarketingScore" INTEGER,
ADD COLUMN     "latestWebsiteScore" INTEGER,
ADD COLUMN     "usesFreeEmail" BOOLEAN;

-- CreateTable
CREATE TABLE "company_audits" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "websiteScore" INTEGER NOT NULL,
    "emailScore" INTEGER NOT NULL,
    "marketingScore" INTEGER NOT NULL,
    "leadScore" INTEGER NOT NULL,
    "category" "AnalysisCategory" NOT NULL,
    "overallOpportunity" "SalesOpportunity" NOT NULL,
    "opportunityReason" TEXT,
    "hasSsl" BOOLEAN,
    "sslValidUntil" TIMESTAMP(3),
    "hasHttpsRedirect" BOOLEAN,
    "isMobileFriendly" BOOLEAN,
    "isResponsive" BOOLEAN,
    "loadTimeMs" INTEGER,
    "hasMetaTitle" BOOLEAN,
    "hasMetaDescription" BOOLEAN,
    "hasH1" BOOLEAN,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "h1Text" TEXT,
    "h1Count" INTEGER,
    "hasFavicon" BOOLEAN,
    "hasRobotsTxt" BOOLEAN,
    "hasSitemap" BOOLEAN,
    "hasContactForm" BOOLEAN,
    "hasGoogleMaps" BOOLEAN,
    "hasPrivacyPolicy" BOOLEAN,
    "hasCookieBanner" BOOLEAN,
    "titleLength" INTEGER,
    "descriptionLength" INTEGER,
    "hasMultipleH1" BOOLEAN,
    "hasMissingHeadings" BOOLEAN,
    "internalLinksCount" INTEGER,
    "hasStructuredData" BOOLEAN,
    "aiDesignScore" INTEGER,
    "aiTrustScore" INTEGER,
    "aiReadabilityScore" INTEGER,
    "aiCtaScore" INTEGER,
    "uxFindings" JSONB,
    "problems" JSONB NOT NULL,
    "businessImpact" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "expertSummary" TEXT,
    "pricingLanding" INTEGER,
    "pricingCompanySite" INTEGER,
    "pricingEcommerce" INTEGER,
    "screenshotDesktopPath" TEXT,
    "screenshotMobilePath" TEXT,
    "scoreBreakdown" JSONB,
    "websiteFindings" JSONB,
    "rawWebsiteData" JSONB,
    "rawAiResponse" JSONB,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_audits" (
    "id" TEXT NOT NULL,
    "companyAuditId" TEXT NOT NULL,
    "emailScore" INTEGER NOT NULL,
    "hasMx" BOOLEAN NOT NULL DEFAULT false,
    "hasSpf" BOOLEAN NOT NULL DEFAULT false,
    "hasDkim" BOOLEAN NOT NULL DEFAULT false,
    "hasDmarc" BOOLEAN NOT NULL DEFAULT false,
    "usesBusinessDomain" BOOLEAN NOT NULL DEFAULT false,
    "usesFreeEmailOnly" BOOLEAN NOT NULL DEFAULT false,
    "findings" JSONB,

    CONSTRAINT "email_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_records" (
    "id" TEXT NOT NULL,
    "emailAuditId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "classification" "EmailProviderType" NOT NULL,

    CONSTRAINT "email_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dns_records" (
    "id" TEXT NOT NULL,
    "emailAuditId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "recordType" "DnsRecordType" NOT NULL,
    "value" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "dns_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_audits" (
    "id" TEXT NOT NULL,
    "companyAuditId" TEXT NOT NULL,
    "marketingScore" INTEGER NOT NULL,
    "hasGoogleAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasGa4" BOOLEAN NOT NULL DEFAULT false,
    "hasGoogleTagManager" BOOLEAN NOT NULL DEFAULT false,
    "hasMetaPixel" BOOLEAN NOT NULL DEFAULT false,
    "hasLinkedInInsight" BOOLEAN NOT NULL DEFAULT false,
    "socialLinks" JSONB,
    "hasGoogleMaps" BOOLEAN NOT NULL DEFAULT false,
    "hasAddress" BOOLEAN NOT NULL DEFAULT false,
    "hasPhone" BOOLEAN NOT NULL DEFAULT false,
    "findings" JSONB,

    CONSTRAINT "marketing_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_audits_companyId_auditedAt_idx" ON "company_audits"("companyId", "auditedAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_audits_companyAuditId_key" ON "email_audits"("companyAuditId");

-- CreateIndex
CREATE INDEX "email_records_emailAuditId_idx" ON "email_records"("emailAuditId");

-- CreateIndex
CREATE INDEX "email_records_address_idx" ON "email_records"("address");

-- CreateIndex
CREATE INDEX "dns_records_emailAuditId_domain_idx" ON "dns_records"("emailAuditId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_audits_companyAuditId_key" ON "marketing_audits"("companyAuditId");

-- CreateIndex
CREATE INDEX "companies_organizationId_latestWebsiteScore_idx" ON "companies"("organizationId", "latestWebsiteScore");

-- CreateIndex
CREATE INDEX "companies_organizationId_latestEmailScore_idx" ON "companies"("organizationId", "latestEmailScore");

-- CreateIndex
CREATE INDEX "companies_organizationId_latestMarketingScore_idx" ON "companies"("organizationId", "latestMarketingScore");

-- CreateIndex
CREATE INDEX "companies_organizationId_hasSpf_idx" ON "companies"("organizationId", "hasSpf");

-- CreateIndex
CREATE INDEX "companies_organizationId_hasDkim_idx" ON "companies"("organizationId", "hasDkim");

-- CreateIndex
CREATE INDEX "companies_organizationId_hasDmarc_idx" ON "companies"("organizationId", "hasDmarc");

-- CreateIndex
CREATE INDEX "companies_organizationId_usesFreeEmail_idx" ON "companies"("organizationId", "usesFreeEmail");

-- AddForeignKey
ALTER TABLE "company_audits" ADD CONSTRAINT "company_audits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_audits" ADD CONSTRAINT "email_audits_companyAuditId_fkey" FOREIGN KEY ("companyAuditId") REFERENCES "company_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_emailAuditId_fkey" FOREIGN KEY ("emailAuditId") REFERENCES "email_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_records" ADD CONSTRAINT "dns_records_emailAuditId_fkey" FOREIGN KEY ("emailAuditId") REFERENCES "email_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_audits" ADD CONSTRAINT "marketing_audits_companyAuditId_fkey" FOREIGN KEY ("companyAuditId") REFERENCES "company_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
