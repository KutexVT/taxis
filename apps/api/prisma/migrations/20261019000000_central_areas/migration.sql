CREATE TABLE "CentralArea" (
    "id" TEXT NOT NULL,
    "centralId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "polygon" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CentralArea_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CentralArea_centralId_idx" ON "CentralArea"("centralId");
ALTER TABLE "CentralArea" ADD CONSTRAINT "CentralArea_centralId_fkey"
  FOREIGN KEY ("centralId") REFERENCES "Central"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverProfile" ADD COLUMN "gpsSharing" BOOLEAN NOT NULL DEFAULT false;
