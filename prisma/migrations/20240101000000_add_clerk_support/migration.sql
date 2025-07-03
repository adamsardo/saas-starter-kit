-- Add Clerk support columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clerkUserId" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "clerkOrgId" TEXT;

-- Add migration tracking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "migratedToClerk" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "migratedToClerk" BOOLEAN DEFAULT FALSE;

-- Create indexes for Clerk IDs
CREATE INDEX IF NOT EXISTS "User_clerkUserId_idx" ON "User"("clerkUserId");
CREATE INDEX IF NOT EXISTS "Team_clerkOrgId_idx" ON "Team"("clerkOrgId");

-- Make clerkUserId and clerkOrgId unique after migration
-- ALTER TABLE "User" ADD CONSTRAINT "User_clerkUserId_unique" UNIQUE ("clerkUserId");
-- ALTER TABLE "Team" ADD CONSTRAINT "Team_clerkOrgId_unique" UNIQUE ("clerkOrgId");