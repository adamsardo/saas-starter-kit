import { prisma } from '../lib/prisma';
import { createClerkClient } from '@clerk/backend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

interface MigrationResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

async function migrateUsers(): Promise<MigrationResult> {
  console.log('Starting user migration to Clerk...');
  
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    // First migrate teams to organizations
    console.log('Migrating teams to Clerk organizations...');
    const teams = await prisma.team.findMany({
      where: { migratedToClerk: false },
    });

    for (const team of teams) {
      try {
        // Check if organization already exists
        let organization;
        const existingOrgs = await clerkClient.organizations.getOrganizationList({
          query: team.slug,
        });

        if (existingOrgs.data.length > 0 && existingOrgs.data[0].slug === team.slug) {
          organization = existingOrgs.data[0];
          console.log(`Organization ${team.name} already exists in Clerk`);
        } else {
          // Create organization in Clerk
          organization = await clerkClient.organizations.createOrganization({
            name: team.name,
            slug: team.slug,
            publicMetadata: {
              migratedFromNextAuth: true,
              originalTeamId: team.id,
              domain: team.domain,
              defaultRole: team.defaultRole,
            },
          });
          console.log(`Created organization ${team.name} in Clerk`);
        }

        // Update team with Clerk organization ID
        await prisma.team.update({
          where: { id: team.id },
          data: { 
            clerkOrgId: organization.id,
            migratedToClerk: true,
          },
        });
      } catch (error) {
        console.error(`Failed to migrate team ${team.name}:`, error);
      }
    }

    // Now migrate users
    console.log('Migrating users to Clerk...');
    const users = await prisma.user.findMany({
      where: { migratedToClerk: false },
      include: {
        teamMembers: {
          include: {
            team: true,
          },
        },
      },
    });

    console.log(`Found ${users.length} users to migrate`);

    // Process users in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user) => {
          try {
            // Check if user already exists in Clerk
            const existingUsers = await clerkClient.users.getUserList({
              emailAddress: [user.email],
            });

            let clerkUser;
            
            if (existingUsers.data.length > 0) {
              console.log(`User ${user.email} already exists in Clerk`);
              clerkUser = existingUsers.data[0];
            } else {
              // Create user in Clerk
              const userData: any = {
                emailAddress: [user.email],
                firstName: user.name?.split(' ')[0] || '',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                skipPasswordRequirement: true, // Users will need to reset password
                publicMetadata: {
                  migratedFromNextAuth: true,
                  originalUserId: user.id,
                },
              };

              // Set email as verified if it was verified in the old system
              if (user.emailVerified) {
                userData.primaryEmailAddressID = user.email;
                userData.emailAddress = [{
                  emailAddress: user.email,
                  verified: true,
                }];
              }

              clerkUser = await clerkClient.users.createUser(userData);
              console.log(`Created user ${user.email} in Clerk`);
            }

            // Update user in database with Clerk ID
            await prisma.user.update({
              where: { id: user.id },
              data: { 
                clerkUserId: clerkUser.id,
                migratedToClerk: true,
              },
            });

            // Migrate team memberships as organization memberships
            for (const membership of user.teamMembers) {
              try {
                if (!membership.team.clerkOrgId) {
                  console.log(`Team ${membership.team.name} not migrated yet, skipping membership`);
                  continue;
                }

                // Add user to organization with appropriate role
                const clerkRole = membership.role === 'OWNER' 
                  ? 'org:owner' 
                  : membership.role === 'ADMIN' 
                    ? 'org:admin' 
                    : 'org:member';

                // Check if membership already exists
                const existingMemberships = await clerkClient.organizations.getOrganizationMembershipList({
                  organizationId: membership.team.clerkOrgId,
                  userId: clerkUser.id,
                });

                if (existingMemberships.data.length === 0) {
                  await clerkClient.organizations.createOrganizationMembership({
                    organizationId: membership.team.clerkOrgId,
                    userId: clerkUser.id,
                    role: clerkRole,
                  });
                  console.log(`Added ${user.email} to organization ${membership.team.name} as ${clerkRole}`);
                }
              } catch (error) {
                console.error(`Failed to migrate team membership for ${user.email}:`, error);
              }
            }

            result.success++;
          } catch (error) {
            console.error(`Failed to migrate user ${user.email}:`, error);
            result.failed++;
            result.errors.push({
              email: user.email,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      // Add delay between batches to respect rate limits
      if (i + batchSize < users.length) {
        console.log(`Processed ${i + batchSize} users, waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateUsers()
    .then((result) => {
      console.log('\nMigration completed!');
      console.log(`✅ Successfully migrated: ${result.success} users`);
      console.log(`❌ Failed: ${result.failed} users`);
      
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(({ email, error }) => {
          console.log(`  - ${email}: ${error}`);
        });
      }
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateUsers };