CREATE TABLE "MapPin" (
    "id" TEXT NOT NULL,
    "centralId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MapPin_centralId_idx" ON "MapPin"("centralId");

ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_centralId_fkey"
FOREIGN KEY ("centralId") REFERENCES "Central"("id") ON DELETE CASCADE ON UPDATE CASCADE;
